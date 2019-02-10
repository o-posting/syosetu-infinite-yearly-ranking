"use strict";
const genreIdTranslation = new Map([
    // [genreId, [specific, generic]]
    ["101", ["異世界", "恋愛"]],
    ["102", ["現実世界", "恋愛"]],
    ["201", ["ハイファンタジー", "ファンタジー"]],
    ["202", ["ローファンタジー", "ファンタジー"]],
    ["301", ["純文学", "文芸"]],
    ["302", ["ヒューマンドラマ", "文芸"]],
    ["303", ["歴史", "文芸"]],
    ["304", ["推理", "文芸"]],
    ["305", ["ホラー", "文芸"]],
    ["306", ["アクション", "文芸"]],
    ["307", ["コメディー", "文芸"]],
    ["401", ["VRゲーム", "SF"]],
    ["402", ["宇宙", "SF"]],
    ["403", ["空想科学", "SF"]],
    ["404", ["パニック", "SF"]],
    ["9901", ["童話", "その他"]],
    ["9902", ["詩", "その他"]],
    ["9903", ["エッセイ", "その他"]],
    ["9904", ["リプレイ", "その他"]],
    ["9905", ["その他", "その他"]],
    ["9801", ["ノンジャンル", "ノンジャンル"]],
]);
const novelDataToNovelDataWithNCode = (original) => {
    const arr = new Array();
    Object.keys(original).forEach((key) => {
        arr.push(Object.assign({ ncode: key }, original[key]));
    });
    return arr;
};
const getRankDisplayedOnScreen = () => {
    for (let i = 1; i < 30000; i++) {
        const el = document.getElementById("card_" + i);
        if (el === null) {
            return 0;
        }
        if (el.getBoundingClientRect().top > 0) {
            return i;
        }
    }
    return 0;
};
// n文字ごとに分割
const splitByLen = (str, n) => {
    const dst = [];
    for (let i = 0; i < str.length; i += n) {
        dst.push(str.substr(i, n));
    }
    return dst;
};
class BlackList {
    constructor() {
        this.ncodes = [];
        // localStorageの読み取りが禁止されているかを確認
        this.canUseLocalStorage = this.isLocalStorageAvailable();
        if (!this.canUseLocalStorage) {
            console.log("エラー: localStorageが存在しません。");
            alert("エラー: localStorageが存在しません。");
            return;
        }
        if (!localStorage.closedCards) {
            localStorage.closedCards = "";
        }
        if (localStorage.closedCards.length % 6) {
            console.error("localStorage.closedCardsの文字数は6の倍数でなければなりません");
            alert("エラー: localStorageのデータにエラーがありました。");
            this.canUseLocalStorage = false;
            return;
        }
        this.ncodes = this.parseStorageData(localStorage.closedCards);
    }
    getList() {
        return Object.freeze(this.ncodes);
    }
    displayClosedCardNcodes() {
        $("#closed_card_ncodes_json").val(JSON.stringify(this.ncodes, null, "    "));
    }
    setNCodeArrToStorage(ncodeArr) {
        this.ncodes = this.removeDuplicates(ncodeArr);
        if (this.canUseLocalStorage) {
            localStorage.closedCards = this.stringifyNCodeList(this.ncodes);
        }
        this.displayClosedCardNcodes();
    }
    setNcodeToStorage(ncode) {
        this.ncodes = this.removeDuplicates([ncode, ...this.ncodes]);
        if (this.canUseLocalStorage) {
            localStorage.closedCards = this.stringifyNCodeList(this.ncodes);
        }
        this.displayClosedCardNcodes();
    }
    isLocalStorageAvailable() {
        try {
            window._ = localStorage;
            return !!localStorage;
        }
        catch (_a) {
            return false;
        }
    }
    parseStorageData(data) {
        // 先頭に'n'をつけて=を消す
        const list = splitByLen(data, 6);
        return list.map((el) => "n" + el.replace(/=/g, ""));
    }
    stringifyNCodeList(data) {
        // 先頭の'n'を取り除いてから'='で6文字に埋める
        return this.removeDuplicates(this.ncodes.map((el) => ("======" + el.slice(1)).slice(-6))).join("");
    }
    removeDuplicates(arr) {
        return arr.filter((x, i) => {
            return arr.indexOf(x) === i;
        });
    }
}
const setLastUpdateTimeText = (lastUpdateTimeLabel) => {
    if (!lastUpdateTimeLabel || !(lastUpdateTimeLabel instanceof HTMLElement)) {
        console.log(`エラー: setLastUpdateTimeTextToPTagへ渡された値の型が間違っています。`);
        console.log(lastUpdateTimeLabel);
        return;
    }
    lastUpdateTimeLabel.innerText = "データ更新日: " + dataVersion;
};
const toHalfWidth = (str) => {
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
        return String.fromCharCode(s.charCodeAt(0) - 65248);
    });
};
// 小説検索のマッチ
const isNovelIncludesSingleString = (novel, strLowerHalfWidth) => {
    // 英字の大文字小文字、英数字の全角半角を区別しない。
    return novel.keywords.some((keyword) => toHalfWidth(keyword.toLowerCase()).includes(strLowerHalfWidth)) ||
        toHalfWidth(novel.synopsis.toLowerCase()).includes(strLowerHalfWidth) ||
        toHalfWidth(novel.title.toLowerCase()).includes(strLowerHalfWidth);
};
const isNovelIncludes = (novel, str) => {
    return toHalfWidth(str).toLowerCase().split(/ |　/g).filter((el) => el)
        .every((s) => isNovelIncludesSingleString(novel, s));
};
class NovelListView {
    constructor(cardContainer) {
        this.originalData = {};
        this.data = [];
        this.blacklist = new Set();
        this.numVisibleCards = 0;
        this.filters = {};
        this.terminated = false;
        if (cardContainer === null) {
            throw Error("Error: cardContainer === null");
        }
        this.cardContainer = cardContainer;
    }
    static createNovelCardHTML(rank, novel, type) {
        const [specific, generic] = genreIdTranslation.get(novel.genre) || ["エラー", "エラー"];
        switch (type) {
            case "close":
                return `<div class="novel_card novel_card_closed" id="card_${rank}"></div>`;
            case "closeHardly":
                return `<div class="novel_card novel_card_closed_hardly" id="card_${rank}"></div>`;
            case "open":
                return `
<div class="novel_card" id="card_${rank}">
    <div>
        <span class="rank_num">${rank}位</span>
        <a class="novel_title" href="https://ncode.syosetu.com/${novel.ncode}/">${novel.title}</a>
        <input type="button" class="btn btn-danger delete_button" value="x" onclick="deleteNovelCard(${rank})">
    </div>
    <div id="novel_info_${rank}" class="novel_info">
        <span class="novel_synopsis">${novel.synopsis}</span><br>
        ジャンル：<span class="blue">${specific}</span>〔${generic}〕<br>
        キーワード： <span class="blue">${novel.keywords.join(" ")}</span><br>
        <span class="margin-right">${novel.state}</span>
        <span class="margin-right">
            約${Math.round(novel.wordCount / 500)}分
            ${("" + novel.wordCount).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,")}文字）
        </span>
        総合評価pt：<span class="red margin-right">${novel.wholePeriodPoint}pt</span>
        年間pt：<span class="red margin-right">${novel.yearlyPoint}pt</span>
    </div>
    <input type="button" id="open_synopsis_button_${rank}"
        class="btn btn-basic2 open_synopsis_button" value="..."
        onclick="openSynopsis(${rank})">
</div>`;
        }
    }
    static closeCard(rank) {
        const card = document.querySelector(`#card_${rank}`);
        if (!card || !(card instanceof HTMLElement)) {
            return;
        }
        card.innerHTML = "";
        card.classList.add("novel_card_closed");
    }
    static closeCardHardly(rank) {
        const card = document.querySelector(`#card_${rank}`);
        if (!card || !(card instanceof HTMLElement)) {
            return;
        }
        card.innerHTML = "";
        card.classList.add("novel_card_closed_hardly");
    }
    setNovelList(list) {
        this.originalData = list;
        this.data = novelDataToNovelDataWithNCode(list);
    }
    sortByYearlyPoint() {
        this.data.sort((a, b) => b.yearlyPoint - a.yearlyPoint);
    }
    setBlacklist(ncodes) {
        this.blacklist = new Set(ncodes);
    }
    clearView() {
        this.terminated = false;
        this.numVisibleCards = 0;
        this.cardContainer.innerHTML = "";
        this.showCards(6);
    }
    // 表示に成功したらtrue
    showCards(num, recursionCount = 0) {
        if (this.terminated) {
            return false;
        }
        if (recursionCount > 500) {
            // スタックオーバーフロー対策
            return true;
        }
        let createdHTML = "";
        let numAppendedVisibleCards = 0;
        for (let rank = this.numVisibleCards + 1; rank < this.numVisibleCards + num + 1; rank++) {
            if (this.data.length <= rank - 1) {
                this.terminated = true;
                return false;
            }
            if (this.filters.completedOnly && this.data[rank - 1].state !== "完結済み") {
                createdHTML += NovelListView.createNovelCardHTML(rank, this.data[rank - 1], "closeHardly");
            }
            else if (this.filters.searchString &&
                (!isNovelIncludes(this.data[rank - 1], this.filters.searchString))) {
                createdHTML += NovelListView.createNovelCardHTML(rank, this.data[rank - 1], "closeHardly");
            }
            else if (this.blacklist.has(this.data[rank - 1].ncode)) {
                createdHTML += NovelListView.createNovelCardHTML(rank, this.data[rank - 1], "close");
                numAppendedVisibleCards++;
            }
            else {
                createdHTML += NovelListView.createNovelCardHTML(rank, this.data[rank - 1], "open");
                numAppendedVisibleCards++;
            }
        }
        this.cardContainer.insertAdjacentHTML("beforeend", createdHTML);
        this.numVisibleCards += num;
        if (numAppendedVisibleCards < num) {
            this.showCards(num - numAppendedVisibleCards, recursionCount + 1);
        }
        return true;
    }
    setScrollButton(el, step) {
        if (el === null) {
            return;
        }
        el.addEventListener("click", () => {
            this.goForward(step);
        });
    }
    initScrollEvent() {
        const $win = $(window);
        const $doc = $(document);
        const appendCardIfNeeded = () => {
            if ($win.scrollTop() >= $doc.height() - $win.height() * 2) {
                this.showCards(6);
            }
        };
        window.addEventListener("scroll", appendCardIfNeeded);
        const loop = () => {
            appendCardIfNeeded();
            setTimeout(loop, 20);
        };
        loop();
    }
    initCardButtonEvent(novelList, blackList) {
        window.deleteNovelCard = (rank) => {
            NovelListView.closeCard(rank);
            blackList.setNcodeToStorage(this.data[rank - 1].ncode);
            novelList.setBlacklist(blackList.getList());
        };
        window.openSynopsis = (rank) => {
            const button = document.querySelector(`#open_synopsis_button_${rank}`);
            if (button && button instanceof HTMLElement) {
                button.style.display = "none";
            }
            $(`#novel_info_${rank}`).toggleClass("open");
        };
    }
    setSearchString(str) {
        this.filters.searchString = str;
    }
    setFilterFlag(key, value) {
        if (key === "completed_only") {
            this.filters.completedOnly = value;
        }
    }
    goForward(step, ignoreError = false) {
        const currentRank = getRankDisplayedOnScreen();
        if (currentRank === 0 && !ignoreError) {
            console.log("現在表示中のカードの検索に失敗");
            return;
        }
        if (document.querySelector(`#card_${currentRank + step}`) === null) {
            this.showCards(step);
        }
        $("html,body").animate({ scrollTop: $(`#card_${currentRank + step}`).offset().top }, 200);
        return;
    }
}
const setBlackListTextAreaChangeEvent = (novelList, blackList) => {
    const blacklistTextarea = document.querySelector("#closed_card_ncodes_json");
    if (blacklistTextarea && blacklistTextarea instanceof HTMLTextAreaElement) {
        blacklistTextarea.addEventListener("change", () => {
            if (confirm("リストの変更を決定しますか？")) {
                try {
                    const list = JSON.parse(blacklistTextarea.value);
                    if (!Array.isArray(list)) {
                        alert("入力されたリストの形式が正しくありません。(配列を渡してください)");
                        return;
                    }
                    if (!list.every((el) => typeof el === "string")) {
                        alert("入力されたリストの形式が正しくありません。(配列の要素はすべて文字列にしてください)");
                        return;
                    }
                    blackList.setNCodeArrToStorage(list);
                    alert("リストが変更されました。");
                    novelList.setBlacklist(blackList.getList());
                    novelList.clearView();
                }
                catch (e) {
                    alert("入力されたリストの形式が正しくありません。(パースに失敗しました)");
                }
            }
            else {
                blackList.displayClosedCardNcodes();
                alert("変更を元に戻しました。");
            }
        });
    }
    else {
        console.log("!(blacklistTextarea && blacklistTextarea instanceof HTMLTextAreaElement)");
    }
};
const setSearchBoxChangeEvent = (novelList, blackList, data) => {
    const searchBoxEl = document.querySelector("#search_box");
    const hitNumEl = document.querySelector("#hit_num");
    if (!hitNumEl) {
        console.log("!hitNumEl");
        return;
    }
    if (searchBoxEl && searchBoxEl instanceof HTMLInputElement) {
        const onKeyHit = () => {
            const searchString = searchBoxEl.value;
            novelList.setSearchString(searchString);
            novelList.clearView();
            hitNumEl.innerHTML = `--/--`;
        };
        const onChange = () => {
            const searchString = searchBoxEl.value;
            novelList.setSearchString(searchString);
            novelList.clearView();
            let numHit = 0;
            data.forEach((novel) => {
                if (isNovelIncludes(novel, searchString)) {
                    numHit++;
                }
            });
            hitNumEl.innerHTML = `${numHit}/${data.length}`;
        };
        searchBoxEl.addEventListener("keydown", onKeyHit);
        searchBoxEl.addEventListener("keyup", onKeyHit);
        searchBoxEl.addEventListener("change", onChange);
    }
    else {
        console.log("!(searchBoxEl && searchBoxEl instanceof HTMLInputElement)");
    }
};
const setCompletedOnlyCheckboxEvent = (novelList) => {
    const checkbox = document.querySelector("#completed_only");
    if (checkbox && checkbox instanceof HTMLInputElement) {
        checkbox.addEventListener("change", () => {
            novelList.setFilterFlag("completed_only", checkbox.checked);
            novelList.clearView();
        });
    }
};
const main = () => {
    setLastUpdateTimeText(document.querySelector("#last_update_time"));
    const blackList = new BlackList();
    blackList.displayClosedCardNcodes();
    const novelList = new NovelListView(document.querySelector("#card_container"));
    novelList.setNovelList(syosetuData);
    novelList.setBlacklist(blackList.getList());
    novelList.sortByYearlyPoint();
    novelList.clearView();
    novelList.setScrollButton(document.querySelector("#go_forward_10"), 10);
    novelList.setScrollButton(document.querySelector("#go_forward_100"), 100);
    novelList.initScrollEvent();
    novelList.initCardButtonEvent(novelList, blackList);
    setBlackListTextAreaChangeEvent(novelList, blackList);
    setSearchBoxChangeEvent(novelList, blackList, novelDataToNovelDataWithNCode(syosetuData));
    setCompletedOnlyCheckboxEvent(novelList);
    // // もしfragment identifierがあればそこまでジャンプ(#120なら120位へ)
    // if (/^[1-9]\d*$/.test(window.location.hash.substr(1))) {
    //     console.log(+window.location.hash.substr(1) + "へジャンプします");
    //     goForward(+window.location.hash.substr(1), true);
    // }
    const loadingTextEl = document.getElementById("loading_text");
    if (loadingTextEl) {
        loadingTextEl.innerHTML = "";
    }
};
main();
//# sourceMappingURL=main.js.map