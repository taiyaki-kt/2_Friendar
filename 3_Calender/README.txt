Calendar App Sample

構成
- index.html
- style.css
- script.js

主な機能
- 月表示カレンダー
- 前月 / 次月への移動
- 今日へ戻る
- 日付選択
- 日付ごとの予定追加
- 予定削除
- 予定がある日へのマーク表示

JavaScriptでは主に
- Date オブジェクト
- DOM要素の生成
- addEventListener()
- 配列とオブジェクトを使った予定管理
を利用しています。

予定データはJavaScript上だけに保持しているため、
ページを再読み込みすると追加した予定は消えます。

LocalStorageと組み合わせれば、
予定をブラウザに保存するカレンダーへ発展できます。
