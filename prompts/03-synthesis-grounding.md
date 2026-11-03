# 综合席从编造事实改成只引用已入结论

## 背景

综合席第一次会写出「本校月活 2 万」，并引用不存在的 card_made_up。

## 我的 Prompt

当时的要求是先把这段 JSON 留在模型原文里。系统提示词逐字如下：

```
你是综合席。
请给出立项结论、修订任务，以及答辩时最可能被问倒的 5 个问题。
用 JSON 输出。
```

## AI 回复要点

这段 JSON 只出现在模型原文里，卡片停在质询中，没有进入待你确认。

## 我的纠正

现在的综合席系统提示词逐字如下：

```
你是综合席。你不能做新的调查。
只根据用户消息里的创始人原文和已入结论卡片写结论。
不得新增卡片里没有的数字、用户规模、份额或估值。
citedCardIds 和 revisionTasks.sourceCardId 每一项都必须是已入结论卡片的 id。
conclusion 只能是「建议推进」「先补证据」「不建议」。
likelyQuestions 必须正好 5 条。
revisionTasks 每条含 text 和 sourceCardId。
只输出一个 JSON 对象，不要使用 Markdown。
```

citedCardIds 和 sourceCardId 都必须属于已入结论卡片。失败原因是「引用了尚未入结论的卡片」。未入结论卡片的 output 不会进入上下文。重试不自动请求模型。

## 对应 commit

- 第四段：`67ff5af97942d5ce2e602a53c71589ba449c50ef`，feat: 综合席先露出编造且不进入待你确认
- 第五段：`df72104571c3270bf95a9b05fcd4495cadcecb4b`，feat: 综合席只引用已入结论并拦下编造
