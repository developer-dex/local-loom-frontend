const React = require('react');

const createSvgComponent = (name) => {
  const Comp = (props) => React.createElement(name, props);
  Comp.displayName = name;
  return Comp;
};

module.exports = {
  Svg: createSvgComponent('Svg'),
  Path: createSvgComponent('Path'),
  G: createSvgComponent('G'),
  Circle: createSvgComponent('Circle'),
  Rect: createSvgComponent('Rect'),
  Line: createSvgComponent('Line'),
  Polyline: createSvgComponent('Polyline'),
  Polygon: createSvgComponent('Polygon'),
  Text: createSvgComponent('SvgText'),
  TSpan: createSvgComponent('TSpan'),
  TextPath: createSvgComponent('TextPath'),
  Use: createSvgComponent('Use'),
  Image: createSvgComponent('SvgImage'),
  Symbol: createSvgComponent('Symbol'),
  Defs: createSvgComponent('Defs'),
  LinearGradient: createSvgComponent('LinearGradient'),
  RadialGradient: createSvgComponent('RadialGradient'),
  Stop: createSvgComponent('Stop'),
  ClipPath: createSvgComponent('ClipPath'),
  Pattern: createSvgComponent('Pattern'),
  Mask: createSvgComponent('Mask'),
  default: createSvgComponent('Svg'),
};
