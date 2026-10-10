# next-steps-desktop

English: A Claude Code mod that shows up to 3 "next step" suggestion buttons above the prompt after each turn (terminal and desktop). Traditional Chinese UI only for now; English is on the to-do list.

每回合結束後，在輸入框上方顯示最多 3 個「下一步」建議按鈕（終端機與桌面版皆可）。

## 安裝

1. 下載到 Claude Code 的 mods 資料夾：

```bash
git clone https://github.com/ELSKKR/next-steps-desktop.git ~/.claude/mods/next-steps-desktop
```

2. 在 `~/.claude/settings.json` 的 `CLAUDE_CODE_PLUGIN_DIRS` 加入這個資料夾路徑（會長期保留的設定，改之前請先備份）。
3. 重新開一個新 session。

驗證：`claude plugin test ~/.claude/mods/next-steps-desktop`

## 授權

MIT
