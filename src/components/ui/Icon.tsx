import { memo } from 'react';
import { Image } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import Add01 from '../../../assets/icons/add-01.svg';
import Album02 from '../../../assets/icons/album-02.svg';
import AlignBoxTopLeft from '../../../assets/icons/align-box-top-left.svg';
import ArrowDown01 from '../../../assets/icons/arrow-down-01.svg';
import ArrowDown02 from '../../../assets/icons/arrow-down-02.svg';
import ArrowLeft01 from '../../../assets/icons/arrow-left-01.svg';
import ArrowLeft02 from '../../../assets/icons/arrow-left-02.svg';
import ArrowRight01 from '../../../assets/icons/arrow-right-01.svg';
import ArrowRight02 from '../../../assets/icons/arrow-right-02.svg';
import ArrowSquareDown from '../../../assets/icons/arrow-square-down.svg';
import ArrowUp01 from '../../../assets/icons/arrow-up-01.svg';
import ArrowUp02 from '../../../assets/icons/arrow-up-02.svg';
import BubbleChat from '../../../assets/icons/bubble-chat.svg';
import Call021 from '../../../assets/icons/call-02-1.svg';
import Call02 from '../../../assets/icons/call-02.svg';
import Cancel01 from '../../../assets/icons/cancel-01.svg';
import CancelCircle from '../../../assets/icons/cancel-circle.svg';
import CloseSquare from '../../../assets/icons/close-square.svg';
import DashboardSquare02 from '../../../assets/icons/dashboard-square-02.svg';
import Download01 from '../../../assets/icons/download-01.svg';
import Flash from '../../../assets/icons/flash.svg';
import FilterHorizontal from '../../../assets/icons/filter-horizontal.svg';
import Frame1321315172 from '../../../assets/icons/Frame 1321315172.svg';
import Gift1 from '../../../assets/icons/gift-1.svg';
import Gift from '../../../assets/icons/gift.svg';
import Gps01 from '../../../assets/icons/gps-01.svg';
import Heart from '../../../assets/icons/heart.svg';
import Group1000005371 from '../../../assets/icons/Group 1000005371.svg';
import Home09 from '../../../assets/icons/home-09.svg';
import IcnHeart from '../../../assets/icons/icn_heart.svg';
import IcnMessageText from '../../../assets/icons/icn_message_text.svg';
import IcnPrivacy from '../../../assets/icons/icn_privacy.svg';
import IcnStar from '../../../assets/icons/icn_star.svg';
import IcnStarHalf from '../../../assets/icons/icn_star-half.svg';
import IconSvg from '../../../assets/icons/icon.svg';
import Location01 from '../../../assets/icons/location-01.svg';
import Location04 from '../../../assets/icons/location-04.svg';
import Mail01 from '../../../assets/icons/mail-01.svg';
import Motorbike02 from '../../../assets/icons/motorbike-02.svg';
import Notification01 from '../../../assets/icons/notification-01.svg';
import PencilEdit02 from '../../../assets/icons/pencil-edit-02.svg';
import Pho1 from '../../../assets/icons/Pho 1.svg';
import Play from '../../../assets/icons/play.svg';
import RotateLeft from '../../../assets/icons/rotate-left.svg';
import Search01 from '../../../assets/icons/search-01.svg';
import Sent from '../../../assets/icons/sent.svg';
import Share08 from '../../../assets/icons/share-08.svg';
import ShoppingBasket01 from '../../../assets/icons/shopping-basket-01.svg';
import ShoppingBasket03 from '../../../assets/icons/shopping-basket-03.svg';
import SmartPhone02 from '../../../assets/icons/smart-phone-02.svg';
import SpoonAndKnife1 from '../../../assets/icons/spoon-and-knife-1.svg';
import SpoonAndKnife from '../../../assets/icons/spoon-and-knife.svg';
import Time04 from '../../../assets/icons/time-04.svg';
import TradeUp1 from '../../../assets/icons/trade-up-1.svg';
import TradeUp from '../../../assets/icons/trade-up.svg';
import TransactionHistory from '../../../assets/icons/transaction-history.svg';
import User03 from '../../../assets/icons/user-03.svg';
import Wallet01 from '../../../assets/icons/wallet-01.svg';
import HomeTab from '../../../assets/icons/home-tab.svg';
import Work from '../../../assets/icons/Work.svg';
import Logout01 from '../../../assets/icons/logout-01.svg';
import About from '../../../assets/icons/about.svg';
import Faq from '../../../assets/icons/faq.svg';
import Help from '../../../assets/icons/help.svg';
import Terms from '../../../assets/icons/terms.svg';
import Trash from '../../../assets/icons/trash.svg';
import IcnEdit02 from '../../../assets/icons/icn_edit-02.svg';

export type IconName =
  | 'Frame 1321315172'
  | 'Group 1000005371'
  | 'Pho 1'
  | 'add-01'
  | 'album-02'
  | 'align-box-top-left'
  | 'arrow-down-01'
  | 'arrow-down-02'
  | 'arrow-left-01'
  | 'arrow-left-02'
  | 'arrow-right-01'
  | 'arrow-right-02'
  | 'arrow-square-down'
  | 'arrow-up-01'
  | 'arrow-up-02'
  | 'bubble-chat'
  | 'call-02'
  | 'call-02-1'
  | 'cancel-01'
  | 'cancel-circle'
  | 'close-square'
  | 'dashboard-square-02'
  | 'download-01'
  | 'filter-horizontal'
  | 'flash'
  | 'gift'
  | 'gift-1'
  | 'gps-01'
  | 'heart'
  | 'home-09'
  | 'icn_heart'
  | 'icn_message_text'
  | 'icn_privacy'
  | 'icn_star'
  | 'icn_star-half'
  | 'icon'
  | 'location-01'
  | 'location-04'
  | 'mail-01'
  | 'motorbike-02'
  | 'notification-01'
  | 'pencil-edit-02'
  | 'play'
  | 'rotate-left'
  | 'search-01'
  | 'sent'
  | 'share-08'
  | 'shopping-basket-01'
  | 'shopping-basket-03'
  | 'smart-phone-02'
  | 'spoon-and-knife'
  | 'spoon-and-knife-1'
  | 'time-04'
  | 'trade-up'
  | 'trade-up-1'
  | 'transaction-history'
  | 'user-03'
  | 'wallet-01'
  | 'home-tab'
  | 'work'
  | 'logout-01'
  | 'about'
  | 'faq'
  | 'help'
  | 'terms'
  | 'trash'
  | 'icn_edit-02';

const ICONS: Record<IconName, React.ComponentType<SvgProps> | number> = {
  'Frame 1321315172': Frame1321315172,
  'Group 1000005371': Group1000005371,
  'Pho 1': Pho1,
  'add-01': Add01,
  'album-02': Album02,
  'align-box-top-left': AlignBoxTopLeft,
  'arrow-down-01': ArrowDown01,
  'arrow-down-02': ArrowDown02,
  'arrow-left-01': ArrowLeft01,
  'arrow-left-02': ArrowLeft02,
  'arrow-right-01': ArrowRight01,
  'arrow-right-02': ArrowRight02,
  'arrow-square-down': ArrowSquareDown,
  'arrow-up-01': ArrowUp01,
  'arrow-up-02': ArrowUp02,
  'bubble-chat': BubbleChat,
  'call-02': Call02,
  'call-02-1': Call021,
  'cancel-01': Cancel01,
  'cancel-circle': CancelCircle,
  'close-square': CloseSquare,
  'dashboard-square-02': DashboardSquare02,
  'download-01': Download01,
  'filter-horizontal': FilterHorizontal,
  flash: Flash,
  gift: Gift,
  'gift-1': Gift1,
  'gps-01': Gps01,
  heart: Heart,
  'home-09': Home09,
  icn_heart: IcnHeart,
  icn_message_text: IcnMessageText,
  icn_privacy: IcnPrivacy,
  icn_star: IcnStar,
  'icn_star-half': IcnStarHalf,
  icon: IconSvg,
  'location-01': Location01,
  'location-04': Location04,
  'mail-01': Mail01,
  'motorbike-02': Motorbike02,
  'notification-01': Notification01,
  'pencil-edit-02': PencilEdit02,
  play: Play,
  'rotate-left': RotateLeft,
  'search-01': Search01,
  sent: Sent,
  'share-08': Share08,
  'shopping-basket-01': ShoppingBasket01,
  'shopping-basket-03': ShoppingBasket03,
  'smart-phone-02': SmartPhone02,
  'spoon-and-knife': SpoonAndKnife,
  'spoon-and-knife-1': SpoonAndKnife1,
  'time-04': Time04,
  'trade-up': TradeUp,
  'trade-up-1': TradeUp1,
  'transaction-history': TransactionHistory,
  'user-03': User03,
  'wallet-01': Wallet01,
  'home-tab': HomeTab,
  'work': Work,
  'logout-01': Logout01,
  about: About,
  faq: Faq,
  help: Help,
  terms: Terms,
  trash: Trash,
  'icn_edit-02': IcnEdit02,
};

export type IconProps = SvgProps & {
  name: IconName;
};

export const Icon = memo(function Icon({ name, width = 24, height = 24, ...props }: IconProps) {
  const Comp = ICONS[name];
  // If Metro is still treating some `.svg` as an asset, it will resolve to a number.
  // This fallback prevents runtime crashes; restarting the bundler with cache clear
  // should make them resolve to components again.
  if (typeof Comp === 'number') {
    return <Image source={Comp} style={{ width: Number(width), height: Number(height) }} resizeMode="contain" />;
  }
  return <Comp width={width} height={height} {...props} />;
});

