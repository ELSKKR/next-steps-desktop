import { test, expect } from 'claude-code/testing'

test('沒有建議時兩種 surface 都不畫關閉按鈕', async ($, on) => {
  on('ui.render', ($e, e) => { const { Text } = $e.ui.resolve(e); return <Text>empty</Text> })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'next-steps-desktop',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
    })
    expect(await ui.find({ key: 'dismiss' })).toBeUndefined()
    await ui.unmount()
  }
})

test('選了建議後面板仍在', async ($, on) => {
  on('ui.render', ($e, e) => { const { Text } = $e.ui.resolve(e); return <Text>empty</Text> })
  on('command.list', () => ({ value: [] }))
  on('model.fork', () => ({ value: { isAnswered: true, text: '["做 A", "做 B"]' } }))
  on('prompt.fill', () => ({ isFilled: true }))
  on('session.id', () => ({ value: 'test-session' }))
  on('turn.complete', () => ({ text: '' }))

  await $.turn.complete({ answer: 'x'.repeat(100), durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'next-steps-desktop',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
    })
    await ui.press({ key: 'pick0' })
    expect(await ui.find({ key: 'pick1' })).toBeDefined()
    await ui.unmount()
  }
})
