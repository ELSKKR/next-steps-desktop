import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

const suggestions = atom({ plugin: 'next-steps-desktop', key: 'suggestions' } as const, [] as string[])

const MIN_ANSWER_CHARS = 80
const MAX_SUGGESTIONS = 3
const MAX_SAVED_SESSIONS = 50

// $.state 只活在這次執行；從側邊欄重開舊 session 時會是空的，
// 所以每次寫入都同步存一份到 $.store（以 session id 分開），開啟時再讀回來
async function saveSuggestions($: EngineInterface, list: string[]) {
  await update($, suggestions, () => list)

  const storeKey = 'suggestions:' + (await $.session.id())
  await $.store.delete(storeKey)
  if (list.length === 0) {
    return
  }
  await $.store.set(storeKey, list)

  // 只保留最近的 MAX_SAVED_SESSIONS 個 session，避免檔案越存越大
  const keys = await $.store.keys()
  const savedKeys = keys.filter(key => key.startsWith('suggestions:'))
  const overflow = savedKeys.length - MAX_SAVED_SESSIONS
  for (let index = 0; index < overflow; index++) {
    await $.store.delete(savedKeys[index]!)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)

    const saved = await $.store.get('suggestions:' + (await $.session.id()))
    if (Array.isArray(saved)) {
      const list: string[] = []
      for (const item of saved) {
        if (typeof item === 'string') {
          list.push(item)
        }
      }
      await update($, suggestions, () => list)
    }

    return result
  })

  on('turn.start', async ($, e, next) => {
    await saveSuggestions($, [])

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)

    // 只在主對話、正常結束、答案夠長時才產生建議
    const isMainAnswer = e.agentId === undefined && !e.isAborted
    if (!isMainAnswer || e.answer.length < MIN_ANSWER_CHARS) {
      return result
    }

    const commands = await $.command.list()
    const commandNames = commands.map(c => c.name)
    const commandLines = commands.map(c => '/' + c.name + ' — ' + c.description).join('\n')

    const question =
      '請列出使用者接下來最可能想輸入的 ' + MAX_SUGGESTIONS + ' 個提示（以使用者口吻、使用與對話相同的語言、每個不超過 40 字）。' +
      '可以是一般句子，也可以是下列斜線指令加參數。只輸出 JSON 字串陣列，不要其他文字。\n' + commandLines

    const reply = await $.model.fork({ prompt: question })
    if (!reply.isAnswered) {
      return result
    }

    const start = reply.text.indexOf('[')
    const end = reply.text.lastIndexOf(']')
    if (start < 0 || end < start) {
      return result
    }

    let parsed: unknown = []
    try {
      parsed = JSON.parse(reply.text.slice(start, end + 1))
    } catch (error) {
      return result
    }
    if (!Array.isArray(parsed)) {
      return result
    }

    const valid: string[] = []
    for (const item of parsed) {
      if (typeof item !== 'string' || item.trim() === '') {
        continue
      }
      // 以 / 開頭的必須是本 session 真的有的指令
      if (item.startsWith('/')) {
        const name = item.slice(1).split(' ')[0]
        if (name === undefined || !commandNames.includes(name)) {
          continue
        }
      }
      valid.push(item.trim())
    }

    await saveSuggestions($, valid.slice(0, MAX_SUGGESTIONS))

    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const items = await read($, suggestions)
    if (e.props.hasSurvey || e.props.isWorking || items.length === 0) {
      return next(e)
    }

    const { Box, Text, Button } = $.ui.resolve(e)
    // 其他 mod 的帶狀面板（例如 cache-meter）畫在卡片上方，不被蓋掉
    const below = await next(e)

    // 圓角卡片：標題 + 右上關閉鈕，建議一律用次要按鈕
    return (
      <Box flexDirection="column">
      {below}
      <Box flexDirection="column" borderStyle="round" borderDimColor paddingX={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold>✦ 下一步</Text>
          <Button key="dismiss" role="dismiss" label="關閉建議" onPress={() => saveSuggestions($, [])} />
        </Box>
        {items.map((text, index) => (
          <Button
            key={'pick' + index}
            variant="secondary"
            label={text}
            // 選了之後面板保留，方便改選別的；送出訊息時（turn.start）才清掉
            onPress={() => $.prompt.fill({ text, mode: 'replace' })}
          />
        ))}
      </Box>
      </Box>
    )
  })
}
