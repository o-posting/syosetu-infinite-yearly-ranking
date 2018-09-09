function createNovelCardHTML(rank, ncode, title, state, synopsis, genreA, genreB, keywords, wordCount, wholePeriodPoint, yearlyPoint){
  return  `  <div class="novel_card" id="card_${rank}">` +
          `    <div>` +
          `      <span class="rank_num">${rank}位</span> <a class="novel_title" href="https://ncode.syosetu.com/${ncode}/">${title}</a>` +
          `      <input type="button" id="delete_button_${rank}" class="btn btn-danger delete_button" value="x">` +
          `    </div>` +
          `    <div>` +
          `      <div class="novel_synopsis">` +
          `        ${synopsis}` +
          `      </div>` +
          `      ジャンル：<span class="blue">${genreA}</span>〔${genreB}〕<br>` +
          `      キーワード： <span class="blue">${keywords.join(' ')}</span><br>` +
          `      <span class="margin-right">${state}</span>` +
          `      <span class="margin-right">約${Math.round(wordCount / 500)}分（${(''+wordCount).replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,')}文字）</span>` +
          `      総合評価pt：<span class="red margin-right">${wholePeriodPoint}pt</span>` +
          `      年間pt：<span class="red margin-right">${yearlyPoint}pt</span>` +
          `    </div>` +
          `  </div>`;
}

function getNcodesOrderedByYearlyPoint(){
  return Object.keys(syosetuData).sort((ncode1, ncode2) => {
    if(syosetuData[ncode1].yearlyPoint < syosetuData[ncode2].yearlyPoint){
      return 1;
    }else if(syosetuData[ncode1].yearlyPoint > syosetuData[ncode2].yearlyPoint){
      return -1;
    }else{
      return 0;
    }
  });
}

function getRankDisplayedOnScreen(){
  for(let i = 1; i < 500000; i++){
    const el = document.getElementById('card_' + i);
    if(el === null) return 0;
    if(el.getBoundingClientRect().top > 0) return i;
  }
}

function closeCard(rank){
  $(`#card_${rank}`).css('height', '2px');
  $(`#card_${rank}`).css('margin-bottom', '2px');
  $(`#card_${rank} *`).css('display', 'none');
}


//n文字ごとに分割
function splitByLen(str, n) {
  for (var dst = [], i = 0; i < str.length; i += n)
    dst.push(str.substr(i, n));
  return dst;
}

function validateStorage(){
  if(!localStorage.closedCards) localStorage.closedCards = "";
  if(localStorage.closedCards.length % 6){
    console.error("localStorage.closedCardsの文字数は6の倍数でなければなりません");
    return false;
  }
  return true;
}


function removeDuplicates(arr){
  return arr.filter(function (x, i) {
    return arr.indexOf(x) === i;
  });
}

function getNcodeArrFromStorage(){
  if(!validateStorage()) return [];
  const list = splitByLen(localStorage.closedCards, 6);
  return list.map(el => 'n' + el.replace(/=/g, ""));
}

function displayClosedCardNcodes(opt_arr){
  $('#closed_card_ncodes_json').val(JSON.stringify(getNcodeArrFromStorage(), null, '  '));
}

function setNcodeArrToStorage(ncodeArr){
  if(!validateStorage()) return;
  //先頭の'n'を取り除いてから'='で6文字に埋める
  const arr = removeDuplicates(ncodeArr.map(el => ('======' + el.slice(1)).slice(-6)));
  localStorage.closedCards = arr.join("");

  displayClosedCardNcodes();
}

function setNcodeToStorage(ncode){
  if(!validateStorage()) return;
  //先頭の'n'を取り除いてから'='で6文字に埋める
  const paddedNcode = ('======' + ncode.slice(1)).slice(-6);
  const arr = removeDuplicates(splitByLen(localStorage.closedCards + paddedNcode, 6));
  localStorage.closedCards = arr.join("");

  displayClosedCardNcodes();
}



$(() => {
  $('#header_line3').html("データ更新日: " + dataVersion);

  const ncodes = getNcodesOrderedByYearlyPoint();
  
  let numAppendedNovel = 0;

  const appendNovelCards = (num) => {
    let createdHTML = "";
    const closedCardNcodes = getNcodeArrFromStorage();
    for(let i = 0; i < num; i++){
      const rank = (numAppendedNovel + i) + 1;
      const ncode = ncodes[(numAppendedNovel + i)];
      const data = syosetuData[ncode];
      createdHTML += createNovelCardHTML(rank, ncode, data.title, data.state, data.synopsis, data.genre, data.genre, data.keywords, data.wordCount, data.wholePeriodPoint, data.yearlyPoint);
    }
    document.getElementById('card_container').insertAdjacentHTML('beforeend', createdHTML);
    for(let i = 0; i < num; i++){
      if(closedCardNcodes.indexOf(ncodes[numAppendedNovel + i]) === -1) continue;
      closeCard(numAppendedNovel + i + 1);
    }
    numAppendedNovel += num;
  };
  const goForward = (num, forced) => {
    const currentRank = getRankDisplayedOnScreen();
    if(currentRank === 0 && !forced){
      console.log("現在表示中のカードの検索に失敗");
      return;
    }
    if(document.getElementById('card_' + (currentRank + num)) === null){
      appendNovelCards(num);
    }
    $("html,body").animate({scrollTop:$('#card_' + (currentRank + num)).offset().top}, 200);
    return;
  };

  $('#go_forward_10').on('click', () => {
    goForward(10);
  });

  $('#go_forward_100').on('click', () => {
    goForward(100);
  });

  const $win = $(window), $doc = $(document);

  $win.scroll(() => {
    if ($win.scrollTop() < $doc.height() - $win.height() * 2) return;
    appendNovelCards(3);
  });
  
  setInterval(() => {
    if ($win.scrollTop() < $doc.height() - $win.height() * 2) return;
    appendNovelCards(3);
  }, 20);

  //要素を生成してからすぐまたはsetTimeoutで一度だけon('click')やonclickを設定してもなぜかうまくいかなかったので、setIntervalで何度も書き込む。
  setInterval(() => {
    $('.delete_button').each((i, el) => {
      el.onclick = () => {
        closeCard(i + 1);
        setNcodeToStorage(ncodes[i]);
      }
    });
  }, 500);

  //もしfragment identifierがあればそこまでジャンプ(#120なら120位へ)
  if(/^[1-9]\d*$/.test(window.location.hash.substr(1))){
    console.log(+window.location.hash.substr(1) + "へジャンプします");
    goForward(+window.location.hash.substr(1), true);
  }

  displayClosedCardNcodes();
  $('#closed_card_ncodes_json').on('change', function() {
    if(confirm('リストの変更を決定しますか？')){
      try{
        let list = JSON.parse($(this).val());
        if(!Array.isArray(list)){
          alert('入力されたリストの形式が正しくありません。(配列を渡してください)');
          return;
        }
        if(!list.every(el => typeof el === 'string')){
          alert('入力されたリストの形式が正しくありません。(配列の要素はすべて文字列にしてください)');
          return;
        }
        setNcodeArrToStorage(list);
        alert('リストが変更されました。反映するにはページを再読み込みしてください。');
      }catch(e){
        alert('入力されたリストの形式が正しくありません。(パースに失敗しました)');
      }
    }else{
      displayClosedCardNcodes();
      alert('変更を元に戻しました。');
    }
  });
  document.getElementById('loading_animation').innerHTML = "";
});
