import { createSelector } from 'reselect';
import { List as ImmutableList } from 'immutable';
import { me } from '../initial_state';

const getAccountBase         = (state, id) => state.getIn(['accounts', id], null);
const getAccountCounters     = (state, id) => state.getIn(['accounts_counters', id], null);
const getAccountRelationship = (state, id) => state.getIn(['relationships', id], null);
const getAccountMoved        = (state, id) => state.getIn(['accounts', state.getIn(['accounts', id, 'moved'])]);

export const makeGetAccount = () => {
  return createSelector([getAccountBase, getAccountCounters, getAccountRelationship, getAccountMoved], (base, counters, relationship, moved) => {
    if (base === null) {
      return null;
    }

    return base.merge(counters).withMutations(map => {
      map.set('relationship', relationship);
      map.set('moved', moved);
    });
  });
};

const toServerSideType = columnType => {
  switch (columnType) {
  case 'home':
  case 'notifications':
  case 'public':
  case 'thread':
    return columnType;
  default:
    if (columnType.indexOf('list:') > -1) {
      return 'home';
    } else {
      return 'public'; // community, account, hashtag
    }
  }
};

export const getFilters = (state, { contextType }) => state.get('filters', ImmutableList()).filter(filter => contextType && filter.get('context').includes(toServerSideType(contextType)) && (filter.get('expires_at') === null || Date.parse(filter.get('expires_at')) > (new Date())));

const escapeRegExp = string =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string

const kanaConvertMap = new Map([
    ["ｧ", "ァ"], ["ｱ", "ア"], ["ｨ", "ィ"], ["ｲ", "イ"], ["ｩ", "ゥ"], ["ｳ", "ウ"], ["ｪ", "ェ"], ["ｴ", "エ"], ["ｫ", "ォ"], ["ｵ", "オ"], ["ｶ", "カ"], ["ｶﾞ", "ガ"], ["ｷ", "キ"], ["ｷﾞ", "ギ"], ["ｸ", "ク"], ["ｸﾞ", "グ"], ["ｹ", "ケ"], ["ｹﾞ", "ゲ"], 
    ["ｺ", "コ"], ["ｺﾞ", "ゴ"], ["ｻ", "サ"], ["ｻﾞ", "ザ"], ["ｼ", "シ"], ["ｼﾞ", "ジ"], ["ｽ", "ス"], ["ｽﾞ", "ズ"], ["ｾ", "セ"], ["ｾﾞ", "ゼ"], ["ｿ", "ソ"], ["ｿﾞ", "ゾ"], ["ﾀ", "タ"], ["ﾀﾞ", "ダ"], ["ﾁ", "チ"], ["ﾁﾞ", "ヂ"], ["ｯ", "ッ"], ["ﾂ", "ツ"], 
    ["ﾂﾞ", "ヅ"], ["ﾃ", "テ"], ["ﾃﾞ", "デ"], ["ﾄ", "ト"], ["ﾄﾞ", "ド"], ["ﾅ", "ナ"], ["ﾆ", "ニ"], ["ﾇ", "ヌ"], ["ﾈ", "ネ"], ["ﾉ", "ノ"], ["ﾊ", "ハ"], ["ﾊﾞ", "バ"], ["ﾊﾟ", "パ"], ["ﾋ", "ヒ"], ["ﾋﾞ", "ビ"], ["ﾋﾟ", "ピ"], ["ﾌ", "フ"], ["ﾌﾞ", "ブ"], 
    ["ﾌﾟ", "プ"], ["ﾍ", "ヘ"], ["ﾍﾞ", "ベ"], ["ﾍﾟ", "ペ"], ["ﾎ", "ホ"], ["ﾎﾞ", "ボ"], ["ﾎﾟ", "ポ"], ["ﾏ", "マ"], ["ﾐ", "ミ"], ["ﾑ", "ム"], ["ﾒ", "メ"], ["ﾓ", "モ"], ["ｬ", "ャ"], ["ﾔ", "ヤ"], ["ｭ", "ュ"], ["ﾕ", "ユ"], ["ｮ", "ョ"], ["ﾖ", "ヨ"],
    ["ﾗ", "ラ"], ["ﾘ", "リ"], ["ﾙ", "ル"], ["ﾚ", "レ"], ["ﾛ", "ロ"], ["ヮ", "ヮ"], ["ﾜ", "ワ"], ["ｦ", "ヲ"], ["ﾝ", "ン"], ["ｳﾞ", "ヴ"], ["｡", "。"], ["ｰ", "ー"], ["｢", "「"], ["｣", "」"], ["､", "、"], ["･", "・"], ["ﾞ", "゛"], ["ﾟ", "゜"]
  ]);

export const normalize = string => {
    return string.replace(/\u3000/g,String.fromCharCode(0x0020))
                 .replace(/\u2018/g,String.fromCharCode(0x0060))
                 .replace(/\u3008/g,String.fromCharCode(0x003C))
                 .replace(/\u3009/g,String.fromCharCode(0x003E))
                 .replace(/\uFFE5/g,String.fromCharCode(0x00A5))
                 .replace(/\uFFE5/g,String.fromCharCode(0x00A5))
                 .replace(/[\u00B4\u2019]/g,String.fromCharCode(0x0027))
                 .replace(/[\u2010-\u2015\u2212\uFF0D]/g,String.fromCharCode(0x002D))
                 .replace(/[\u201C\u201D]/g,String.fromCharCode(0x0022))
                 .replace(/[\uFF01\uFF03-\uFF06\uFF08-\uFF5D]/g, function(s) {
                           return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
                       })
                 .replace(/([\uFF73\uFF76-\uFF84\uFF8A-\uFF8E]\uFF9E)|([\uFF8A-\uFF8E]\uFF9F)|([\uFF61-\uFF9F])/g, function(s) {
                           return kanaConvertMap.get(s);
                       });
};

export const regexFromFilters = filters => {
  if (filters.size === 0) {
    return null;
  }

  return new RegExp(filters.map(filter => {
    let expr = escapeRegExp(normalize(filter.get('phrase')));

    if (filter.get('whole_word')) {
      if (/^[\w]/.test(expr)) {
        expr = `\\b${expr}`;
      }

      if (/[\w]$/.test(expr)) {
        expr = `${expr}\\b`;
      }
    }

    return expr;
  }).join('|'), 'i');
};

export const makeGetStatus = () => {
  return createSelector(
    [
      (state, { id }) => state.getIn(['statuses', id]),
      (state, { id }) => state.getIn(['statuses', state.getIn(['statuses', id, 'reblog'])]),
      (state, { id }) => state.getIn(['accounts', state.getIn(['statuses', id, 'account'])]),
      (state, { id }) => state.getIn(['accounts', state.getIn(['statuses', state.getIn(['statuses', id, 'reblog']), 'account'])]),
      getFilters,
    ],

    (statusBase, statusReblog, accountBase, accountReblog, filters) => {
      if (!statusBase) {
        return null;
      }

      if (statusReblog) {
        statusReblog = statusReblog.set('account', accountReblog);
      } else {
        statusReblog = null;
      }

      const dropRegex = (accountReblog || accountBase).get('id') !== me && regexFromFilters(filters.filter(filter => filter.get('irreversible')));
      if (dropRegex && dropRegex.test(statusBase.get('reblog') ? statusReblog.get('search_index') : statusBase.get('search_index'))) {
        return null;
      }

      const regex     = (accountReblog || accountBase).get('id') !== me && regexFromFilters(filters);
      const filtered = regex && regex.test(normalize(statusBase.get('reblog') ? statusReblog.get('search_index') : statusBase.get('search_index')));

      return statusBase.withMutations(map => {
        map.set('reblog', statusReblog);
        map.set('account', accountBase);
        map.set('filtered', filtered);
      });
    }
  );
};

const getAlertsBase = state => state.get('alerts');

export const getAlerts = createSelector([getAlertsBase], (base) => {
  let arr = [];

  base.forEach(item => {
    arr.push({
      message: item.get('message'),
      title: item.get('title'),
      key: item.get('key'),
      dismissAfter: 5000,
      barStyle: {
        zIndex: 200,
      },
    });
  });

  return arr;
});

export const makeGetNotification = () => {
  return createSelector([
    (_, base)             => base,
    (state, _, accountId) => state.getIn(['accounts', accountId]),
  ], (base, account) => {
    return base.set('account', account);
  });
};

export const getAccountGallery = createSelector([
  (state, id) => state.getIn(['timelines', `account:${id}:media`, 'items'], ImmutableList()),
  state       => state.get('statuses'),
], (statusIds, statuses) => {
  let medias = ImmutableList();

  statusIds.forEach(statusId => {
    const status = statuses.get(statusId);
    medias = medias.concat(status.get('media_attachments').map(media => media.set('status', status)));
  });

  return medias;
});
