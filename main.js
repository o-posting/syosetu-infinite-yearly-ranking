

/* 全てのカードをレスポンシブルにしたら重すぎて使いにくくなったコード
function createNovelCardHTML(rank, ncode, title, state, synopsis, genreA, genreB, keywords, wordCount, wholePeriodPoint, yearlyPoint){
  return  `<div class="row"><div class="col"><div class="novel_card" id="card_${rank}"><div class="container">` +
          `<div class="row novel_title_row">` +
          `  <div class="col">` +
          `    <span class="rank_num">${rank}位</span> <a class="novel_title" href="https://ncode.syosetu.com/${ncode}/">${title}</a>` +
          `    <input type="button" id="delete_button_${rank}" class="btn btn-danger delete_button" value="x">` +
          `  </div>` +
          `</div>` +
          `<div class="row no-gutters novel_info_row">` +
          `  <div class="col-sm-1">` +
          `    <span class="center">${state}</span>` +
          `  </div>` +
          `  <div class="col-sm-11">` +
          `    <div class="novel_synopsis">` +
          `      ${synopsis}` +
          `    </div>` +
          `    ジャンル：<span class="blue">${genreA}</span>〔${genreB}〕<br>` +
          `    キーワード： <span class="blue">${keywords.join(' ')}</span><br>` +
          `    <div class="row" style="max-width: 700px;">` +
          `      <div class="col-sm-5">` +
          `        約${Math.round(wordCount / 500)}分（${(''+wordCount).replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,')}文字）` +
          `      </div>` +
          `      <div class="col-sm-4">` +
          `        総合評価pt：<span class="red">${wholePeriodPoint}pt</span>` +
          `      </div>` +
          `      <div class="col-sm-3">` +
          `        年間pt：<span class="red">${yearlyPoint}pt</span>` +
          `      </div>` +
          `    </div>` +
          `  </div>` +
          `</div>` +
          `</div></div></div></div>`;
}
*/

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

$(() => {
  $('#header_line3').html("データ更新日: " + dataVersion);
  const ncodes = getNcodesOrderedByYearlyPoint();
  let numAppendedNovel = 0;
  const appendNovelCards = (num) => {
    let createdHTML = "";
    for(let i = 0; i < num; i++){
      const rank = numAppendedNovel + 1;
      const data = syosetuData[ncodes[numAppendedNovel]];
      createdHTML += createNovelCardHTML(rank, data.ncode, data.title, data.state, data.synopsis, data.genre, data.genre, data.keywords, data.wordCount, data.wholePeriodPoint, data.yearlyPoint);
      numAppendedNovel++;
    }
    document.getElementById('card_container').insertAdjacentHTML('beforeend', createdHTML);
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
  }

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

  //要素を生成してからすぐまたはsetTimeoutで一度だけon('click')やonclickを設定してもなぜかうまくいかなかったので、あきらめてsetIntervalで何度も書き込む。
  setInterval(() => {
    $('.delete_button').each((i, el) => {
      const rank = i + 1;
      el.onclick = () => {
        $('#card_' + rank).css('display', 'none');
      }
    });
  }, 500);

  //もしfragment identifierがあればそこまでジャンプ(#120なら120位へ)
  if(/^[1-9]\d*$/.test(window.location.hash.substr(1))){
    console.log(+window.location.hash.substr(1) + "へジャンプします");
    goForward(+window.location.hash.substr(1), true);
  }

  document.getElementById('loading_animation').innerHTML = "";
});
