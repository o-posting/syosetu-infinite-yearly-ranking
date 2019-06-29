# このプロジェクトについて
GitHub Pagesを使って「小説家になろう」の年間ランキングを無限スクロール表示するサイトを作りました。
https://o-posting.github.io/syosetu-infinite-yearly-ranking/


データは事前にスクレイピングしてsyosetu_data.jsに入れてあり、htmlを開くたびにデータを送受信するわけではありません。ランキングに載るのはほぼすべての15万字以上の小説です。文字数が少ないほど小説数が爆発的に増えるため、比較的大きな小説のみを集めました。

スクレイピングは（一応）サーバへの影響を考慮して、9秒に検索1回のペースで行いました。

# 使い方
https://o-posting.github.io/syosetu-infinite-yearly-ranking/ にアクセスすると使えます。
右下にあるボタンを押せば、一度に大きくスクロールできます。
