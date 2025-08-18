module.exports = async ctx => {
  try {
    if (ctx.message.reply_to_message) {
      const owner = ctx.message.reply_to_message.from;

      // 检查被回复的用户是否是机器人
      if (owner.is_bot) {
        return await ctx.replyWithHTML('机器人不能被设置为贴纸包所有者。', {
          reply_to_message_id: ctx.message.message_id,
          allow_sending_without_reply: true
        });
      }

      ctx.group.info.stickerPackOwner = owner.id;
      await ctx.group.info.save();

      // 对名字进行HTML转义以防止注入
      const ownerName = owner.first_name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const successMessage = ctx.i18n.t('sticker.set_owner.suc', { ownerName: ownerName });
      
      await ctx.replyWithHTML(successMessage, {
        reply_to_message_id: ctx.message.message_id,
        allow_sending_without_reply: true
      });

    } else {
      await ctx.replyWithHTML(ctx.i18n.t('sticker.set_owner.empty_forward'), {
        reply_to_message_id: ctx.message.message_id,
        allow_sending_without_reply: true
      });
    }
  } catch (error) {
    console.error('Error in handleStickerOwner:', error);
    await ctx.replyWithHTML(`设置贴纸所有者时发生错误: \n<pre>${error.message}</pre>`, {
      reply_to_message_id: ctx.message.message_id,
      allow_sending_without_reply: true
    });
  }
};
