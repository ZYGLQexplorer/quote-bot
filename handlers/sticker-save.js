const sharp = require('sharp')
const {
  userName,
  downloadFileByUrl
} = require('../utils')

module.exports = async ctx => {
  let result = ''
  const chatMember = await ctx.getChatMember(ctx.from.id)
  const isAdmin = ['creator', 'administrator'].includes(chatMember.status)
  
  // 如果不是管理员，且群组未开启普通用户保存，则拒绝
  if (!isAdmin && !ctx.group.info.settings.publicSave) {
    return ctx.replyWithHTML('🚫 此功能仅限管理员使用。\n管理员可在 /config 中开启普通用户保存权限。', {
      reply_to_message_id: ctx.message.message_id,
      allow_sending_without_reply: true
    })
  }
  
  if (ctx.message.reply_to_message) {
    const replyMessage = ctx.message.reply_to_message

    const stickerLinkPrefix = 'https://t.me/addstickers/'
    let stickerFile

    if (replyMessage.sticker) {
      if (replyMessage.sticker.is_animated === true) {
        result = ctx.i18n.t('sticker.save.error.animated')
      } else {
        stickerFile = replyMessage.sticker
      }
    } else if (replyMessage.document) {
      if (['image/jpeg', 'image/png'].indexOf(replyMessage.document.mime_type) >= 0) {
        stickerFile = replyMessage.document
      }
    } else if (replyMessage.photo) {
      // eslint-disable-next-line prefer-destructuring
      stickerFile = replyMessage.photo.slice(-1)[0]
      if (replyMessage.caption) stickerFile.emoji = replyMessage.caption
    }

    if (stickerFile) {
      const fileUrl = await ctx.telegram.getFileLink(stickerFile)
      const data = await downloadFileByUrl(fileUrl)
      const imageSharp = sharp(data.read())
      const imageMetadata = await imageSharp.metadata()

      if (imageMetadata.height >= imageMetadata.width) {
        imageSharp.resize({ height: 512 })
      } else {
        imageSharp.resize({ width: 512 })
      }

      const stickerPNG = await imageSharp.webp({ quality: 100 }).png({
        compressionLevel: 9,
        force: false
      }).toBuffer()

      let stickerAdd
      let emojis = ''

      if (ctx.match[1]) emojis += ctx.match[1]
      if (stickerFile.emoji) emojis += stickerFile.emoji
      emojis += '🌟'

      if (!ctx.group.info.stickerSet.name) {
        const packName = `g${Math.random().toString(36).substring(5)}_${Math.abs(ctx.group.info.group_id)}_by_${ctx.options.username}`
        const packTitle = `${ctx.group.info.title.substring(0, 30)} pack by @${ctx.options.username}`

        let owner;

        // 检查是否已指定所有者
        if (ctx.group.info.stickerPackOwner) {
          try {
            // 尝试获取指定所有者的信息
            owner = await ctx.telegram.getChat(ctx.group.info.stickerPackOwner);
          } catch (e) {
             result = `<b>无法获取指定所有者信息。</b>\n<pre>${e.message}</pre>`;
          }
        } else {
          // 否则，回退到查找群主
          const chatAdministrators = await ctx.getChatAdministrators()
          let chatAdministrator = { user: ctx.from } // 默认是当前用户

          const creator = chatAdministrators.find(admin => admin.status === 'creator');
          if (creator) {
            chatAdministrator = creator;
          }
          owner = chatAdministrator.user;
        }

        if (owner) {
            stickerAdd = await ctx.telegram.createNewStickerSet(owner.id, packName, packTitle, {
              png_sticker: { source: stickerPNG },
              emojis
            }).catch((error) => {
              const ownerName = userName(owner, true);
              if (error.description === 'Bad Request: PEER_ID_INVALID' || error.description === 'Forbidden: bot was blocked by the user') {
                if (ctx.group.info.stickerPackOwner) {
                  // 如果是指定的所有者
                  result = ctx.i18n.t('sticker.save.error.need_user_start', { ownerName });
                } else {
                  // 如果是群主
                  result = ctx.i18n.t('sticker.save.error.need_creator', { creator: ownerName });
                }
              } else {
                result = ctx.i18n.t('sticker.save.error.telegram', { error });
              }
            });

            if (stickerAdd) {
              ctx.group.info.stickerSet.name = packName;
              ctx.group.info.stickerSet.create = true;
            }
        }

      } else {
        stickerAdd = await ctx.telegram.addStickerToSet(ctx.from.id, ctx.group.info.stickerSet.name.toLowerCase(), {
          png_sticker: { source: stickerPNG },
          emojis
        }, false).catch((error) => {
          if (error.description.includes('STICKERSET_INVALID') || error.description.includes('TOO_MUCH')) {
            ctx.group.info.stickerSet = undefined
            delete ctx.group.info.stickerSet
          }

          result = ctx.i18n.t('sticker.save.error.telegram', {
            error
          })
        })
      }

      if (stickerAdd) {
        result = ctx.i18n.t('sticker.save.suc', {
          link: `${stickerLinkPrefix}${ctx.group.info.stickerSet.name}`
        })
      }
      // ctx.telegram.setChatStickerSet(ctx.chat.id, ctx.group.info.stickerSet.name)
    } else {
      result = ctx.i18n.t('sticker.empty_forward')
    }
  } else {
    result = ctx.i18n.t('sticker.empty_forward')
  }

  if (result) {
    await ctx.replyWithHTML(result, {
      reply_to_message_id: ctx.message.message_id,
      allow_sending_without_reply: true
    })
  }
}
