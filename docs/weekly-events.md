# 事件彈出通知

營運頁面已移除本週大事、獨立週次列及事件內容區，不保留空白占位。財報頂端使用半透明反白週次；財務報表縮成較小字，放在週報／年報頁籤之前。報表頁籤比照行政管理的框線、底色、選中效果、字級與按鈕高度，支援原方向鍵操作。週次不因切至年報而消失。

尚未新增隨機事件資料庫、抽選機率或效果。既有MV0503第四週事件以及未來每週抽出的事件，均使用置中的深色半透明、細金邊對話卡。沒有事件不顯示。公告只有了解；需要決策的事件使用其實際選項，交由onDecision執行。內容以textContent插入，可換行、不解讀HTML。

CinemaEvents.render({events,onDecision,onAcknowledge,acknowledged,defer})：

- events元素為唯一id、title、message，可選choices（唯一id與label）。
- 無choices則顯示了解；有choices卻無onDecision則按鍵停用，不杜撰決策效果。
- onDecision({eventId,choiceId})可為async；處理時停用按鈕，成功關閉並顯示下一事件，失敗提供原卡重試。
- onAcknowledge(eventId)通知遊戲保存已讀／已處理記錄。eventNoticeAcknowledged存當週絕對週與事件id；已存的已讀事件不因刷新重複跳出。舊存檔缺此欄位不擋載入。
- acknowledged排除已讀事件，defer供繳費通知先顯示；了解繳費後呼叫CinemaEvents.present()，依序展示排隊事件，不堆疊彈窗。無定時輪詢、無額外資料庫讀取。

年度會議仍使用獨立annual-meeting-section四區版型，僅在會議期間顯示，其他週隱藏。取消事件欄不影響年度會議的結算、排行及頁尾開始下一年度。

驗證tests/weekly-events-browser.cjs涵蓋320／390／1440px、週次位置、報表頁籤樣式及鍵盤、公告佇列、決策成功／失敗重試、繳費優先、MV0503真實事件、已讀保存及刷新。年度會議另見tests/annual-meeting-browser.cjs。
