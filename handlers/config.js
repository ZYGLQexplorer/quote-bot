const { userName } = require('../utils')
const { getGroup } = require('../helpers')

module.exports = async ctx => {
  // 如果是回调（按钮点击），需要确保获取到 Group 数据
  if (ctx.callbackQuery) {
    await getGroup(ctx)
  }

  if (ctx.callbackQuery) {
    const chatMember = await ctx.getChatMember(ctx.from.id)
    if (!['creator', 'administrator'].includes(chatMember.status)) {
      return ctx.answerCbQuery('❌ 只有管理员可以更改此设置', true)
    }

    // 切换设置
    ctx.group.info.settings.publicSave = !ctx.group.info.settings.publicSave
    await ctx.group.info.save()
  }

  // 1. 获取贴纸包所有者信息
  let ownerInfo = '未设置'
  if (ctx.group.info.stickerPackOwner) {
    try {
      // 尝试获取群成员信息
      const ownerMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.group.info.stickerPackOwner)
      const name = userName(ownerMember.user)
      ownerInfo = `${name} (ID: <code>${ownerMember.user.id}</code>)`
    } catch (e) {
      // 如果用户已退群或获取失败，显示 ID
      ownerInfo = `未知用户 (ID: <code>${ctx.group.info.stickerPackOwner}</code>)`
    }
  }

  // 2. 获取是否允许普通用户保存
  const publicSave = ctx.group.info.settings.publicSave
  const publicSaveStatus = publicSave ? '✅ 允许' : '❌ 禁止'

  const text = `<b>⚙️ 群组配置</b>\n\n` +
               `👤 <b>贴纸包所有者:</b> ${ownerInfo}\n` +
               `💾 <b>普通用户保存 (/qs):</b> ${publicSaveStatus}`

  const keyboard = {
    inline_keyboard: [
      [{ 
        text: publicSave ? '🚫 禁止普通用户保存' : '✅ 允许普通用户保存', 
        callback_data: 'config:toggle_public_save' 
      }]
    ]
  }

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {})
    await ctx.answerCbQuery()
  } else {
    await ctx.replyWithHTML(text, { reply_markup: keyboard })
  }
}
