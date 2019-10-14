
import {Point} from '@antv/g-base/lib/types'
import {vec2} from '@antv/matrix-util';
import {each, isNil, mix, upperFirst} from '@antv/util';
import GroupComponent from '../abstract/group-component';
import {IList} from '../intefaces';
import {getMatrixByAngle} from '../util/matrix';
import Theme from '../util/theme';
abstract class AxisBase extends GroupComponent implements IList {
  public getDefaultCfg() {
    const cfg = super.getDefaultCfg();
    return {
      ...cfg,
      name: 'axis',
      ticks: [],
      line: {},
      tickLine: {},
      subTickLine: null,
      title: null,
      /**
       * 文本标签的配置项
       */
      label: {},
      /**
       * 垂直于坐标轴方向的因子，决定文本、title、tickLine 在坐标轴的哪一侧
       */
      verticalFactor: 1,
      defaultCfg: {
        line: { // @type {Attrs} 坐标轴线的图形属性,如果设置成null，则不显示轴线
          style: {
            lineWidth: 1,
            stroke: Theme.lineColor
          }
        },
        tickLine: { // @type {Attrs} 标注坐标线的图形属性
          style: {
            lineWidth: 1,
            stroke: Theme.lineColor,
          },
          alignTick: true, // 是否同 tick 对齐
          length: 5
        },
        subTickLine: { // @type {Attrs} 标注坐标线的图形属性
          style: {
            lineWidth: 1,
            stroke: Theme.lineColor,
          },
          count: 4, // 子刻度线的数量，将两个刻度线划分成 5 份
          length: 2
        },
        label: {
          autoRotate: true,
          autoHide: true,
          style: {
            fontSize: 12,
            fill: Theme.textColor,
            textBaseline: 'middle',
            fontFamily: Theme.fontFamily
          },
          offset: 10
        },
        title: {
          autoRotate: true,
          position: 'center', // start, center, end
          style: {
            fontSize: 12,
            fill: Theme.textColor,
            textBaseline: 'middle',
            fontFamily: Theme.fontFamily,
            textAlign: 'center'
          },
          offset: 48
        }
      }

    };
  }

  /**
   * 绘制组件
   */
  public renderInner(group, isRegister) {
    if (this.get('line')) {
      this.drawLine(group, isRegister);
    }
    if (this.get('title')) {
      this.drawTitle(group, isRegister);
    }
    // drawTicks 包括 drawLabels 和 drawTickLines
    this.drawTicks(group, isRegister);
  }
  
  // IList 接口的实现
  public getItems(){
    return this.get('ticks');
  }

  public setItems(items) {
    this.update({
      ticks: items
    });
  }

  public updateItem(item, cfg) {

  }

  public clearItems() {

  }

  public setItemState(item, state, value) {

  }

  /**
   * @protected
   * 获取坐标轴线的路径，不同的坐标轴不一样
   */
  protected abstract getLinePath();

  /**
   * 获取坐标轴垂直方向的向量
   * @param {number} offset 距离点距离
   * @param {Point} point  坐标轴上的一点
   */
  protected abstract getSideVector(offset, point);
  /**
   * 获取坐标轴的向量
   * @param {Point} point 坐标轴上的点
   */
  protected abstract getAxisVector(point);

  protected getSidePoint(point, offset) {
    const self = this;
    const vector = self.getSideVector(offset, point);
    return {
      x: point.x + vector[0],
      y: point.y + vector[1]
    };
  }

  /**
   * 根据 tick.value 获取坐标轴上对应的点
   * @param {number} tickValue 
   * @returns {Point}
   */
  protected abstract getTickPoint(tickValue: number): Point;

  protected getTextAnchor(vector) {
    const ratio = Math.abs(vector[1] / vector[0]);
    let align;
    if (ratio >= 1) { // 上面或者下面
      align = 'center';
    } else {
      if (vector[0] > 0) { // 右侧
        align = 'start';
      } else { // 左侧
        align = 'end';
      }
    }
    return align;
  }

  // 绘制坐标轴线
  private drawLine(group, isRegister) {
    const path = this.getLinePath();
    const line = this.get('line'); // line 的判空在调用 drawLine 之前，不在这里判定
    const lineShape = group.addShape({
      type: 'path',
      id: this.getElementId('line'),
      name: 'axis-line',
      attrs: mix({
        path
      }, line.style)
    });
    isRegister && this.registerElement(lineShape);
  }

  private getTickLineItems(ticks) {
    const tickLineItems = [];
    const tickLine = this.get('tickLine');
    const alignTick = tickLine.alignTick;
    const tickLineLength = tickLine.length;
    let tickSegment = 1;
    const tickCount = ticks.length;
    if (tickCount >= 2) {
      tickSegment = ticks[1].value - ticks[0].value;
    }

    each(ticks, (tick, index) => {
      let point = tick.point;
      if (!alignTick) { // tickLine 不同 tick 对齐时需要调整 point
        point = this.getTickPoint(tick.value - tickSegment / 2);
      }
      const endPoint = this.getSidePoint(point, tickLineLength);
      tickLineItems.push({
        startPoint: point,
        tickValue: tick.value,
        endPoint,
        id: `tickline-${tick.id}`
      });
    });

    // 如果 tickLine 不居中对齐，则需要在最后面补充一个 tickLine
    if (!alignTick && tickCount > 0) {
      const tick = ticks[tickCount - 1];
      const point = this.getTickPoint(tick.value + tickSegment / 2);
    }
    return tickLineItems;
  }

  private getSubTickLineItems(tickLineItems) {
    const subTickLineItems = [];
    const subTickLine = this.get('subTickLine');
    const subCount = subTickLine.count;
    const tickLineCount = tickLineItems.length;
    // 刻度线的数量大于 2 时，才绘制子刻度
    if (tickLineCount >= 2) {
      for(let i = 0; i < tickLineCount - 1; i++) {
        const pre = tickLineItems[i];
        const next = tickLineItems[i + 1];
        for(let j = 0; j < subCount; j ++) {
          const percent = (j + 1) / (subCount + 1);
          const tickValue = (1 - percent) * pre.tickValue + percent * next.tickValue;
          const point = this.getTickPoint(tickValue);
          const endPoint = this.getSidePoint(point, subTickLine.length);
          subTickLineItems.push({
            startPoint: point,
            endPoint,
            tickValue,
            id: `sub-${pre.id}-${j}`
          });
        }
      }
    }
    return subTickLineItems;
  }

  private getTickLineAttrs(tickItem) {
    const tickLineStyle = this.get('tickLine').style;
    const {startPoint, endPoint} = tickItem;
    const attrs = mix({
      x1: startPoint.x,
      y1: startPoint.y,
      x2: endPoint.x,
      y2: endPoint.y
    }, tickLineStyle);
    return attrs;
  }

  // 绘制坐标轴刻度线
  private drawTick(tickItem, tickLineGroup, isRegister) {
    const tickLine = tickLineGroup.addShape({
      type: 'line',
      id: this.getElementId(tickItem.id),
      name: 'axis-tickline',
      attrs: this.getTickLineAttrs(tickItem)
    });
    isRegister && this.registerElement(tickLine);
  }

  // 绘制坐标轴刻度线，包括子刻度线
  private drawTickLines(group, isRegister) {
    const ticks = this.get('ticks');
    const tickLine = this.get('tickLine');
    const subTickLine = this.get('subTickLine');
    const tickLineItems = this.getTickLineItems(ticks);
    const tickLineGroup = group.addGroup({
      name: 'axis-tickline-group',
      id: this.getElementId('tickline-group')
    });
    isRegister && this.registerElement(tickLineGroup);

    each(tickLineItems, item => {
      this.drawTick(item, tickLineGroup, isRegister);
    });

    if (subTickLine) {
      const subTickLineItems = this.getSubTickLineItems(tickLineItems);
      each(subTickLineItems, item => {
        this.drawTick(item, tickLineGroup, isRegister);
      });
    }
  }

  // 预处理 ticks 确定位置和补充 id
  private processTicks() {
    const ticks = this.get('ticks');
    each(ticks, (tick, index) => {
      tick.point = this.getTickPoint(tick.value);
      // 补充 tick 的 id，为动画和更新做准备
      if (isNil(tick.id)) { // 默认使用 tick.name 作为id
        tick.id = tick.name;
      }
    });
  }

  // 绘制 ticks 包括文本和 tickLine
  private drawTicks(group, isRegister) {
    this.processTicks();
    if (this.get('label')) {
      this.drawLabels(group, isRegister);
    }

    if (this.get('tickLine')) {
      this.drawTickLines(group, isRegister);
    }
  }

  // 获取 label 的配置项
  private getLabelAttrs(tick, index) {
    const labelCfg = this.get('label');
    const {offset, style, rotate, formatter} = labelCfg;
    const point = this.getSidePoint(tick.point, offset);
    const vector = this.getSideVector(offset, point);
    const text = formatter ? formatter(tick.name, tick, index) : tick.name;
    const attrs = mix({
      x: point.x,
      y: point.y,
      text,
      textAlign: this.getTextAnchor(vector)
    }, style);
    if (rotate) {
      attrs.matrix = getMatrixByAngle(point, rotate);
    }
    return attrs;
  }

  // 绘制文本
  private drawLabels(group, isRegister) {
    const ticks = this.get('ticks');
    const labelGroup = group.addGroup({
      name: 'axis-label-group',
      id: this.getElementId('label-group')
    });
    isRegister && this.registerElement(labelGroup);
    each(ticks, (tick, index) => {
      const labelShape = labelGroup.addShape({
        type: 'text',
        name: 'axis-label',
        id: this.getElementId(`label-${tick.id}`),
        attrs: this.getLabelAttrs(tick,index)
      });
      isRegister && this.registerElement(labelShape);
    });
  }

  // 标题的属性
  private getTitleAttrs() {
    const titleCfg = this.get('title');
    const {style, position, offset, autoRotate} = titleCfg;
    let percent = 0.5;
    if (position === 'start') {
      percent = 0;
    } else if (position === 'end') {
      percent = 1;
    }
    const point = this.getTickPoint(percent); // 标题对应的坐标轴上的点
    const titlePoint = this.getSidePoint(point, offset); // 标题的点

    const attrs = mix({
      x: titlePoint.x,
      y: titlePoint.y,
      text: titleCfg.text
    }, style);

    const rotate = titleCfg.rotate; // rotate 是角度值
    let angle = rotate;
    if (isNil(rotate) && titleCfg.autoRotate) { // 用户没有设定旋转角度，同时设置自动旋转
      const vector = this.getAxisVector(point);
      const v1 = [ 1, 0 ]; // 水平方向的向量
      angle = vec2.angleTo(vector, v1, true);
    }
    if (angle) {
      const matrix = getMatrixByAngle(titlePoint, angle);
      attrs.matrix = matrix;
    }
    return attrs;
  }

  // 绘制标题
  private drawTitle(group, isRegister) {
    const title = this.get('title');
    const titleShape = group.addShape({
      type: 'text',
      id: this.getElementId('title'),
      name: 'axis-title',
      attrs: this.getTitleAttrs()
    });
    isRegister && this.registerElement(titleShape);
  }

}

export default AxisBase;