const Util = require('../util');
const Component = require('../component');

const KEYWORDS = [ 'min', 'max', 'median', 'start', 'end' ];

function getFirstScale(scales) {
  let firstScale;
  Util.each(scales, scale => {
    if (scale) {
      firstScale = scale;
      return false;
    }
  });
  return firstScale;
}

class Guide extends Component {
  getDefaultCfg() {
    const cfg = super.getDefaultCfg();
    return Util.mix({}, cfg, {
      xScales: null,
      yScales: null,
      el: null
    });
  }

  render() {}

  // TODO，重绘
  // beforeDraw() { }
  // draw() { } // 单纯更新视图
  // afterDraw() { }
  // TODO

  /**
   * 清理图形、元素
   * @override
   */
  clear() {
    const self = this;
    const el = self.get('el');
    el && el.remove();
  }

  /**
   * 显示、隐藏
   * @protected
   * @param {Boolean} visible 是否可见
   */
  changeVisible(visible) {
    const self = this;
    self.set('visible', visible);
    const el = self.get('el');

    if (!el) return;
    if (el.set) {
      el.set('visible', visible);
    } else {
      el.style.display = visible ? '' : 'none';
    }
  }

  /**
   * 将原始数值转换成坐标系上的点
   * @protected
   * @param  {Coord} coord  坐标系
   * @param  {Object | Array | Function} position 位置点
   * @return {Object} 转换成坐标系上的点
   */
  parsePoint(coord, position) {
    const self = this;
    const xScales = self.get('xScales');
    const yScales = self.get('yScales');
    if (Util.isFunction(position)) {
      position = position(xScales, yScales); // position 必须是对象
    }

    let x;
    let y;

    // 如果数据格式是 ['50%', '50%'] 的格式
    if (Util.isArray(position) && Util.isString(position[0]) && position[0].indexOf('%') !== -1) {
      return this._parsePercentPoint(coord, position);
    }

    if (Util.isArray(position)) { // 数组  [2, 1]
      x = self._getNormalizedValue(position[0], getFirstScale(xScales));
      y = self._getNormalizedValue(position[1], getFirstScale(yScales));
    } else {
      for (const field in position) {
        const value = position[field];
        if (xScales[field]) {
          x = self._getNormalizedValue(value, xScales[field]);
        }

        if (yScales[field]) {
          y = self._getNormalizedValue(value, yScales[field]);
        }
      }
    }

    if (!Util.isNil(x) && !Util.isNil(y)) {
      return coord.convert({
        x,
        y
      });
    }
  }

  /**
   * 将原始数值归一化
   * @param  {string | number} val   原始值
   * @param  {Scale} scale 度量对象
   * @return {Number}       返回归一化后的数值
   */
  _getNormalizedValue(val, scale) {
    let result;
    if (Util.indexOf(KEYWORDS, val) !== -1) { // 分类则对应索引值
      let scaleValue;
      if (val === 'start') { // 坐标系开始的位置
        result = 0;
      } else if (val === 'end') {
        result = 1;
      } else if (val === 'median') {
        scaleValue = scale.isCategory ? (scale.values.length - 1) / 2 : (scale.min + scale.max) / 2;
        result = scale.scale(scaleValue);
      } else {
        if (scale.isCategory) {
          scaleValue = (val === 'min') ? 0 : (scale.values.length - 1);
        } else {
          scaleValue = scale[val];
        }
        result = scale.scale(scaleValue);
      }
    } else {
      result = scale.scale(val);
    }

    return result;
  }

  /**
   * 如果传入的值是百分比的格式，根据坐标系的起始点和宽高计算
   * @param {Coord} coord 坐标系对象
   * @param {Array} position 百分比数组
   * @return {Object}       返回解析后的对象
   */
  _parsePercentPoint(coord, position) {
    const xPercent = parseFloat(position[0]) / 100;
    const yPercent = parseFloat(position[1]) / 100;
    const start = coord.start;
    const end = coord.end;
    const topLeft = {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y)
    };
    const x = coord.width * xPercent + topLeft.x;
    const y = coord.height * yPercent + topLeft.y;
    return {
      x,
      y
    };
  }
}

module.exports = Guide;
