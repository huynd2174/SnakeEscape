import { _decorator, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SnakePiece')
export class SnakePiece extends Component {
    @property
    snakeId: number = 0;

    @property
    pieceIndex: number = 0;
}