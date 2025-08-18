module.exports = async ctx => {
  if (ctx.message.reply_to_message) {
    const owner = ctx.message.reply_to_message.from;
    ctx.group.info.stickerPackOwner = owner.id;
    await ctx.group.info.save();
    await ctx.replyWithHTML(ctx.i18n.t('sticker.set_owner.suc', { ownerName: owner.first_name }));
  } else {
    await ctx.replyWithHTML(ctx.i18n.t('sticker.set_owner.empty_forward'));
  }
};
