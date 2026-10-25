# 非每週支出提醒

實際出帳當週以置中確認卡顯示費用，不再放在本週大事裡。與年度票價確認共用深色半透明底、細金邊、微暗背景樣式，桌機和手機都置中，只有「了解」一個按鈕。同週多項費用合併為同一張卡，不逐張打斷操作。

文案依實際帳單及金額：

- 本週應繳租金 NT$金額。
- 同週租金加管理費：本週應繳租金、管理費合計 NT$合計金額。
- 自有的布洛威／YLC只有管理費：本週應繳管理費 NT$金額。
- 本週應繳房屋稅、地價稅合計 NT$金額。
- 本週應繳水電網路費 NT$金額。

從rent、managementFee、propertyTax、utilityBills當週實際出帳收據彙總正金額，免繳、0元及非出帳週不彈窗。這只是唯讀通知，不更動公式、出帳週次或重複扣費。不動產稅與房屋／地價稅是同一合計費用，沒有再拆算。

按「了解」記錄paymentNoticeAcknowledgedWeek（絕對營運週）並走原自動存檔流程；開啟存檔時，刷新或繼續同一週不重複提醒。尚未了解就刷新，仍會提醒；存檔關閉時不為通知另行寫入。Esc不能跳過這張卡。週次及收支已完成原本出帳，了解不推進週次。舊存檔無已讀欄位時，只提示當週帳單，不補彈過往帳單。年度會議不顯示繳費通知；電影事件及決策維持原本區塊。

跨年沿用絕對營運週，通知不影響虛擬年度會議、年度票價確認及各費用收取週期。

程式weekly-events.js/paymentReminders、game.js/showPaymentNotice。
測試tests/payment-reminders.cjs、tests/payment-notice-browser.cjs、tests/weekly-events-browser.cjs、tests/annual-ticket-lock-browser.cjs。
