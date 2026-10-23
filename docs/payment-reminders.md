# 非每週支出提醒

本週大事合併顯示電影事件與繳費提醒；年度會議仍使用原會議畫面。提醒是唯讀文字，不新增決策或扣款，也不顯示「無法干預」等多餘字樣。首週沒有事件仍自然隱藏。

- 租金：依rent實際出帳紀錄，出帳週提醒「本週繳交租金」。
- 布洛威／YLC：依managementFee實際出帳紀錄提醒管理費（W4起每4週）；與租金同週合併成「本週繳交租金及管理費」，自有無租金時為「本週繳交管理費」。
- 公共事業帳單：依Parameter.utility_bill.gapWeeks（8週）提醒「本週繳交水電網路費」。
- 不動產稅：依propertyTax實際出帳紀錄提醒「本週繳交房屋稅、地價稅」，每年W46；承租或公會堂自有免稅時不提醒。

租金與不動產稅金額必須大於0才產生繳費提醒。管理費已連動實際出帳；水電網路費金額尚未連動，現階段僅依既有Parameter週期顯示到期提醒，不虛構其財報扣款。

週期從絕對營運週計算、跨年不重置；例如第56週（2023 W6）為水電費到期週。提醒只在當週顯示，重載以相同資料還原，每項只有一則；下週沒有繳費時即消失。虛擬年度會議不產生額外提醒或帳單。

程式weekly-events.js/paymentReminders與game.js/renderBulletin；測試tests/payment-reminders.cjs、tests/rent-browser.cjs、tests/property-tax-browser.cjs、tests/weekly-events-browser.cjs。
