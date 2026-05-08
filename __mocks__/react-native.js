/**
 * Minimal react-native mock for ts-jest / node environment.
 * Provides just enough for component rendering tests.
 */
const React = require('react');

const createComponent = (name) => {
  const Comp = ({ children, ...props }) =>
    React.createElement(name, props, children);
  Comp.displayName = name;
  return Comp;
};

const View = createComponent('View');
const Text = createComponent('Text');
const TextInput = createComponent('TextInput');
const Pressable = createComponent('Pressable');
const Image = createComponent('Image');
const ScrollView = createComponent('ScrollView');
const KeyboardAvoidingView = createComponent('KeyboardAvoidingView');
const ActivityIndicator = createComponent('ActivityIndicator');
const TouchableOpacity = createComponent('TouchableOpacity');
const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => style,
  hairlineWidth: 1,
};
const Animated = {
  Value: class {
    constructor(val) { this._val = val; }
    setValue(v) { this._val = v; }
  },
  View: createComponent('Animated.View'),
  Text: createComponent('Animated.Text'),
  timing: () => ({ start: () => {}, stop: () => {} }),
  loop: (anim) => ({ start: () => {}, stop: () => {} }),
  sequence: (anims) => ({ start: () => {}, stop: () => {} }),
};
const Easing = {
  linear: (t) => t,
  ease: (t) => t,
};
const Keyboard = {
  dismiss: () => {},
};

module.exports = {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Keyboard,
  Platform: { OS: 'ios', select: (obj) => obj.ios ?? obj.default },
};
