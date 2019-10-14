
import {ListItem} from './types';
export interface IList {
  getItems(): ListItem[];
  setItems(items: ListItem[]);
  updateItem(item: ListItem, cfg);
  clearItems();
  setItemState(item: ListItem, state: string, value: any);
};

export interface IPointLocation {
  getLocationPoint();
  setLocationPoint(point);
}

export interface IRangeLocation {
  getLocationRange();
  setLocationRange(range);
}

export interface IPointsLocation {
  getLocationPoints();
  setLocationPoints(points);
}
