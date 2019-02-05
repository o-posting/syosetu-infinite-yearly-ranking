interface NovelData {
    errors: object[];
    genre: string;
    keywords: string[];
    state: "短編" | "連載中" | "完結済み" | "error";
    synopsis: string;
    title: string;
    wholePeriodPoint: number;  // 非公開なら-2, エラーなら-1
    wordCount: number;
    yearlyPoint: number;       // 非公開またはエラーなら-2
}

interface NovelDataWithNCode {
    errors: object[];
    genre: string;
    keywords: string[];
    ncode: string;
    state: "短編" | "連載中" | "完結済み" | "error";
    synopsis: string;
    title: string;
    wholePeriodPoint: number;  // 非公開なら-2, エラーなら-1
    wordCount: number;
    yearlyPoint: number;       // 非公開またはエラーなら-2
}

declare let syosetuData: { [ncode: string]: NovelData };
declare let dataVersion: string;
declare const $: any;

const genreIdTranslation = new Map<string, [string, string]>([
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

const novelDataToNovelDataWithNCode = (original: typeof syosetuData): NovelDataWithNCode[] => {
    const arr = new Array<NovelDataWithNCode>();
    Object.keys(original).forEach((key) => {
        arr.push({ ncode: key, ...original[key] });
    });
    return arr;
};

const getRankDisplayedOnScreen = (): number => {
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
const splitByLen = (str: string, n: number): string[] => {
    const dst = [];
    for (let i = 0; i < str.length; i += n) {
        dst.push(str.substr(i, n));
    }
    return dst;
};

class BlackList {
    private canUseLocalStorage: boolean;
    private ncodes: string[] = [];

    constructor() {
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

    public getList(): ReadonlyArray<string> {
        return Object.freeze(this.ncodes);
    }

    public displayClosedCardNcodes() {
        $("#closed_card_ncodes_json").val(JSON.stringify(this.ncodes, null, "    "));
    }

    public setNCodeArrToStorage(ncodeArr: string[]) {
        this.ncodes = this.removeDuplicates(ncodeArr);
        if (this.canUseLocalStorage) {
            localStorage.closedCards = this.stringifyNCodeList(this.ncodes);
        }
        this.displayClosedCardNcodes();
    }

    public setNcodeToStorage(ncode: string) {
        this.ncodes = this.removeDuplicates([ncode, ...this.ncodes]);
        if (this.canUseLocalStorage) {
            localStorage.closedCards = this.stringifyNCodeList(this.ncodes);
        }
        this.displayClosedCardNcodes();
    }

    private isLocalStorageAvailable() {
        try {
            (window as any)._ = localStorage;
            return !!localStorage;
        } catch {
            return false;
        }
    }

    private parseStorageData(data: string): string[] {
        // 先頭に'n'をつけて=を消す
        const list = splitByLen(data, 6);
        return list.map((el) => "n" + el.replace(/=/g, ""));
    }

    private stringifyNCodeList(data: string[]): string {
        // 先頭の'n'を取り除いてから'='で6文字に埋める
        return this.removeDuplicates(this.ncodes.map((el) => ("======" + el.slice(1)).slice(-6))).join("");
    }

    private removeDuplicates(arr: string[]) {
        return arr.filter((x, i) => {
            return arr.indexOf(x) === i;
        });
    }
}

const setLastUpdateTimeText = (lastUpdateTimeLabel: Element | null) => {
    if (!lastUpdateTimeLabel || !(lastUpdateTimeLabel instanceof HTMLElement)) {
        console.log(`エラー: setLastUpdateTimeTextToPTagへ渡された値の型が間違っています。`);
        console.log(lastUpdateTimeLabel);
        return;
    }
    lastUpdateTimeLabel.innerText = "データ更新日: " + dataVersion;
};

const toHalfWidth = (str: string) => {
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
        return String.fromCharCode(s.charCodeAt(0) - 65248);
       });
};

// 小説検索のマッチ
const isNovelIncludesSingleString = (novel: NovelDataWithNCode, strLowerHalfWidth: string) => {
    // 英字の大文字小文字、英数字の全角半角を区別しない。
    return novel.keywords.some((keyword) => toHalfWidth(keyword.toLowerCase()).includes(strLowerHalfWidth)) ||
           toHalfWidth(novel.synopsis.toLowerCase()).includes(strLowerHalfWidth) ||
           toHalfWidth(novel.title.toLowerCase()).includes(strLowerHalfWidth);
};
const isNovelIncludes = (novel: NovelDataWithNCode, str: string): boolean => {
    return toHalfWidth(str).toLowerCase().split(/ |　/g).filter((el) => el)
        .every((s) => isNovelIncludesSingleString(novel, s));
};

class NovelListView {
    private static createNovelCardHTML(rank: number, novel: NovelDataWithNCode) {
        const [specific, generic] = genreIdTranslation.get(novel.genre) || ["エラー", "エラー"];
        return `
        <div class="novel_card" id="card_${rank}">
            <div>
                <span class="rank_num">${rank}位</span>
                <a class="novel_title" href="https://ncode.syosetu.com/${novel.ncode}/">${novel.title}</a>
                <input type="button" class="btn btn-danger delete_button" value="x">
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
                class="btn btn-basic2 open_synopsis_button" value="...">
        </div>`;
    }

    private static closeCard(rank: number) {
        if (!document.getElementById("card_" + rank)) {
            return;
        }
        $(`#card_${rank}`).css("height", "2px");
        $(`#card_${rank}`).css("margin-bottom", "2px");
        $(`#card_${rank} *`).css("display", "none");
    }

    private static closeCardHardly(rank: number) {
        if (!document.getElementById("card_" + rank)) {
            return;
        }
        $(`#card_${rank}`).css("height", "1px");
        $("#card_" + rank).css("background", "transparent");

        $("#card_" + rank).css("-webkit-box-shadow", "none");
        $("#card_" + rank).css("box-shadow", "none");
        $("#card_" + rank).css("-webkit-filter", "none");
        $("#card_" + rank).css("filter", "none");

        $(`#card_${rank}`).css("margin-bottom", "0px");
        $(`#card_${rank}`).css("margin-top", "0px");
        $(`#card_${rank}`).css("padding-bottom", "0px");
        $(`#card_${rank}`).css("padding-top", "0px");
        $(`#card_${rank} *`).css("display", "none");
    }

    private originalData: typeof syosetuData = {};
    private data: NovelDataWithNCode[] = [];
    private blacklist: Set<string> = new Set();
    private numVisibleCards: number = 0;
    private cardContainer: Element;
    private filters: { completedOnly?: boolean, searchString?: string } = {};
    private terminated: boolean = false;

    public constructor(cardContainer: Element | null) {
        if (cardContainer === null) {
            throw Error("Error: cardContainer === null");
        }
        this.cardContainer = cardContainer;
    }

    public setNovelList(list: typeof syosetuData): void {
        this.originalData = list;
        this.data = novelDataToNovelDataWithNCode(list);
    }

    public sortByYearlyPoint(): void {
        this.data.sort((a, b) => b.yearlyPoint - a.yearlyPoint);
    }

    public setBlacklist(ncodes: ReadonlyArray<string>): void {
        this.blacklist = new Set(ncodes);
    }

    public clearView(): void {
        this.terminated = false;
        this.numVisibleCards = 0;
        this.cardContainer.innerHTML = "";
        this.showCards(30);
    }

    // 表示に成功したらtrue
    public showCards(num: number): boolean {
        if (this.terminated) {
            return false;
        }
        let createdHTML = "";
        for (let rank = this.numVisibleCards + 1; rank < this.numVisibleCards + num + 1; rank++) {
            if (this.data.length < rank - 1) {
                this.terminated = true;
                return false;
            }
            createdHTML += NovelListView.createNovelCardHTML(rank, this.data[rank - 1]);
        }
        this.cardContainer.insertAdjacentHTML("beforeend", createdHTML);
        for (let rank = this.numVisibleCards + 1; rank < this.numVisibleCards + num + 1; rank++) {
            // 完全削除
            if (this.filters.completedOnly) {
                if (this.data[rank - 1].state !== "完結済み") {
                    NovelListView.closeCardHardly(rank);
                    continue;
                }
            }
            if (this.filters.searchString) {
                if (!isNovelIncludes(this.data[rank - 1], this.filters.searchString)) {
                    NovelListView.closeCardHardly(rank);
                    continue;
                }
            }
            // 縮小
            if (this.blacklist.has(this.data[rank - 1].ncode)) {
                NovelListView.closeCard(rank);
                continue;
            }
        }
        this.numVisibleCards += num;
        return true;
    }

    public setScrollButton(el: Element | null, step: number): void {
        if (el === null) {
            return;
        }
        el.addEventListener("click", () => {
            this.goForward(step);
        });
    }

    public initScrollEvent(): void {
        const $win = $(window);
        const $doc = $(document);
        window.addEventListener("scroll", () => {
            if ($win.scrollTop() < $doc.height() - $win.height() * 2) {
                return;
            }
            this.showCards(3);
        });
        setInterval(() => {
            if ($win.scrollTop() < $doc.height() - $win.height() * 2) {
                return;
            }
            this.showCards(3);
        }, 20);
    }

    public initCardButtonEvent(setNcodeToStorage: (ncode: string) => void): void {
        // 要素を生成してからすぐまたはsetTimeoutで一度だけon('click')やonclick
        // を設定してもなぜかうまくいかなかったので、setIntervalで何度も書き込む。
        setInterval(() => {
            document.querySelectorAll(".delete_button").forEach((el) => {
                const parent = el.parentElement;
                if (parent === null) {
                    console.log("parent === null");
                    return;
                }
                const rankNumEl = parent.querySelector(".rank_num");
                if (rankNumEl === null || !(rankNumEl instanceof HTMLElement)) {
                    console.log("rankNumEl === null || !(rankNumEl instanceof HTMLElement)");
                    return;
                }
                const rank: number = +rankNumEl.innerText.replace("位", "");
                el.addEventListener("click", () => {
                    NovelListView.closeCard(rank);
                    setNcodeToStorage(this.data[rank - 1].ncode);
                });
            });
            document.querySelectorAll(".open_synopsis_button").forEach((el, i) => {
                el.addEventListener("click", () => {
                    $(el).css("display", "none");
                    $(`#novel_info_${i + 1}`).toggleClass("open");
                });
            });
        }, 500);
    }

    public setSearchString(str: string) {
        this.filters.searchString = str;
    }

    public setFilterFlag(key: "completed_only", value: boolean): void {
        if (key === "completed_only") {
            this.filters.completedOnly = value;
        }
    }

    private goForward(step: number, ignoreError: boolean = false) {
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

const setBlackListTextAreaChangeEvent = (
        novelList: NovelListView, blackList: BlackList): void => {
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
                } catch (e) {
                    alert("入力されたリストの形式が正しくありません。(パースに失敗しました)");
                }
            } else {
                blackList.displayClosedCardNcodes();
                alert("変更を元に戻しました。");
            }
        });
    } else {
        console.log("!(blacklistTextarea && blacklistTextarea instanceof HTMLTextAreaElement)");
    }
};

const setSearchBoxChangeEvent = (
        novelList: NovelListView, blackList: BlackList, data: NovelDataWithNCode[]): void => {
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
            let numHit: number = 0;
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
    } else {
        console.log("!(searchBoxEl && searchBoxEl instanceof HTMLInputElement)");
    }
};

const setCompletedOnlyCheckboxEvent = (novelList: NovelListView): void => {
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
    novelList.initCardButtonEvent(blackList.setNcodeToStorage.bind(blackList));

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
