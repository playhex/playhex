import { dijkstra } from './dijkstra.js';
import { WHO_RED, WHO_BLUE, WHO_NONE, sign, parseMove } from './utils.js';

/**
 * @param {String[]} movesHistory
 */
export function State(level, movesHistory) {
    let currentMove = WHO_RED;
    let theComputer = WHO_RED;
    let theComputerLevel = level;
    let useComputer = true;
    let isFirst = true;

    let isStart = false;
    let isOver = false;

    let i, j, k, IsOver = true,
        IsStart0, Start, Start0, Size = 11,
        IsRunning = false,
        LastEvent = "";
    let MoveCount = 0,
        MaxMoveCount, MaxFld = Size * Size,
        IsSwap, ActiveColor = 0;
    let IsPlayer = new Array(2);
    let Level = new Array(2);
    let ImgNum = new Array(Size);
    for (i = 0; i < Size; i++)
        ImgNum[i] = new Array(Size);
    let Fld = new Array(Size);
    for (i = 0; i < Size; i++)
        Fld[i] = new Array(Size);
    let Pot = new Array(Size);
    for (i = 0; i < Size; i++)
        Pot[i] = new Array(Size);
    for (i = 0; i < Size; i++) {
        for (j = 0; j < Size; j++)
            Pot[i][j] = new Array(4);
    }
    let Bridge = new Array(Size);
    for (i = 0; i < Size; i++)
        Bridge[i] = new Array(Size);
    for (i = 0; i < Size; i++) {
        for (j = 0; j < Size; j++)
            Bridge[i][j] = new Array(4);
    }
    let Upd = new Array(Size);
    for (i = 0; i < Size; i++)
        Upd[i] = new Array(Size);
    let History = new Array(MaxFld + 1);
    for (i = 0; i < MaxFld + 1; i++)
        History[i] = new Array(2);

    this.makeMove = function (who, ii, jj) {
        var iis = jj,
            jjs = ii;
        if (Fld[iis][jjs])
            return false;
        Fld[iis][jjs] = WHO_NONE === who ? 0 : WHO_RED === who ? -1 : 1;
        //    RefreshPic(iis, jjs);
        //更新总移动步数
        if (History[MoveCount][0] != ii) {
            History[MoveCount][0] = ii;
            MaxMoveCount = MoveCount + 1;
        }
        if (History[MoveCount][1] != jj) {
            History[MoveCount][1] = jj;
            MaxMoveCount = MoveCount + 1;
        }
        MoveCount++;
        if (MaxMoveCount < MoveCount)
            MaxMoveCount = MoveCount;
        //updatePot(theComputerLevel); // getpot — Get the piece position // Do not compute "pot" while replaying history
        return MoveCount;
    }

    IsStart0 = true;
    IsPlayer[0] = false;
    IsPlayer[1] = false;
    Level[0] = 3;
    Level[1] = 3;

    init();

    // Replay game
    if (Array.isArray(movesHistory)) {
        for (let i = 0; i < movesHistory.length; ++i) {
            const [ii, jj] = parseMove(movesHistory[i]);
            this.makeMove((i % 2) === 0 ? WHO_RED : WHO_BLUE, ii, jj);
        }
    }

    this.getBestMove = (who, theLevel) => {
        updatePot(theLevel);
        const theCol = WHO_NONE === who ? 0 : WHO_RED === who ? -1 : 1;
        // WHO_RED === who ? -1 : 1 — Is it red now? If yes, return -1, else return 1
        // WHO_NONE === who
        // theCol < 0 means red, theCol > 0 means blue
        let ii, jj, kk, ii_b, jj_b, ff = 0,
            ii_q = 0,
            jj_q = 0,
            cc, pp0, pp1;
        let mmp;
        const vv = new Array();
        // When the game starts and the first piece is placed, ff equals 190 / (number of moves squared)
        if (MoveCount > 0) ff = 190 / (MoveCount * MoveCount);
        let mm = 20000; // weight value
        // Traverse the entire board
        // Initially, each Fld[][] is 0, so if it is not zero, this position is occupied
        for (ii = 0; ii < Size; ii++) {
            for (jj = 0; jj < Size; jj++) {
                // If a piece is placed; ii starts from zero, so row count adds one, jj does not
                if (Fld[ii][jj] != 0) {
                    ii_q += 2 * ii + 1 - Size; // For example, 6th piece on 7th row, ii=6, jj=6, ii_q=2
                    jj_q += 2 * jj + 1 - Size; // jj_q=2
                } // Due to looping, all placed pieces are summed using the above formula during traversal
                // But if ii or jj <= 5, ii_q or jj_q value will decrease or stay zero
            }
        }
        // Convert ii_q and jj_q to <0 -1, >0 1
        // The total size=11, when <=5 values decrease or stay, >5 values increase
        // Then pass to sign function to convert ii_q to -1 or 1
        // c: Determines if more pieces are in upper half or lower half
        // Same for left and right halves
        ii_q = sign(ii_q);
        jj_q = sign(jj_q);
        // Traverse the board again
        for (ii = 0; ii < Size; ii++) {
            for (jj = 0; jj < Size; jj++) {
                // If this place is not occupied
                if (Fld[ii][jj] == 0) {
                    // Generate a helper number that affects future moves.
                    // If level 10 is selected, mmp is exact, future moves will be optimal
                    // For other levels, mmp will have errors to lower difficulty
                    mmp = Math.random() * (10 - theLevel) / 10 * 50; // Level 10 means 0
                    // mmp = 0;
                    // Math.abs takes absolute value
                    // mmp adds deviation from center multiplied by move count weight (190 / move count squared; more moves mean smaller ff)
                    mmp += (Math.abs(ii - 5) + Math.abs(jj - 5)) * ff;
                    // mmp further adds 8 * (upper half / lower half difference * deviation from center (up/down + left/right) / (move count + 1))
                    // Positioning to quarter sections
                    mmp += 8 * (ii_q * (ii - 5) + jj_q * (jj - 5)) / (MoveCount + 1);
                    // If chosen level is greater than 6
                    if (theLevel > 6) {
                        // Traverse
                        for (kk = 0; kk < 4; kk++)
                            // bridge 11*11*4
                            mmp -= Bridge[ii][jj][kk];
                    }
                    // pot[][][0] from 0 to 10 corresponds to weight values from bottom row to top row on interface
                    // pot[][][1] from 0 to 10 corresponds to weight values from first row to last row on interface
                    // pot[][][3] is the weight of the corresponding position
                    // pot[][][2] is the weight of the corresponding position on the flipped board
                    pp0 = Pot[ii][jj][0] + Pot[ii][jj][1]; // Distance from middle line, sum of weights [0] + [1] are the same for each position
                    pp1 = Pot[ii][jj][2] + Pot[ii][jj][3]; // After placing a piece, [][][3] changes from the position to the next smaller number
                    mmp += pp0 + pp1;
                    if ((pp0 <= 268) || (pp1 <= 268)) mmp -= 400; // 140+128 // Means on the very edge row
                    vv[ii * Size + jj] = mmp;
                    if (mmp < mm) {
                        mm = mmp;
                        ii_b = ii;
                        jj_b = jj;
                    }
                }
            }
        }
        if (theLevel > 4) {
            mm += 108;
            for (ii = 0; ii < Size; ii++) {
                for (jj = 0; jj < Size; jj++) {
                    if (vv[ii * Size + jj] < mm) {
                        if (theCol < 0) //red
                        {
                            if ((ii > 3) && (ii < Size - 1) && (jj > 0) && (jj < 3)) {
                                if (Fld[ii - 1][jj + 2] == -theCol) {
                                    cc = CanConnectFarBorder(ii - 1, jj + 2, -theCol);
                                    if (cc < 2) {
                                        ii_b = ii;
                                        if (cc < -1) {
                                            ii_b--;
                                            cc++;
                                        }
                                        jj_b = jj - cc;
                                        mm = vv[ii * Size + jj];
                                    }
                                }
                            }
                            if ((ii > 0) && (ii < Size - 1) && (jj == 0)) {
                                if ((Fld[ii - 1][jj + 2] == -theCol) &&
                                    (Fld[ii - 1][jj] == 0) && (Fld[ii - 1][jj + 1] == 0) && (Fld[ii][jj + 1] == 0) && (Fld[ii + 1][jj] == 0)) {
                                    ii_b = ii;
                                    jj_b = jj;
                                    mm = vv[ii * Size + jj];
                                }
                            }
                            if ((ii > 0) && (ii < Size - 4) && (jj < Size - 1) && (jj > Size - 4)) {
                                if (Fld[ii + 1][jj - 2] == -theCol) {
                                    cc = CanConnectFarBorder(ii + 1, jj - 2, -theCol);
                                    if (cc < 2) {
                                        ii_b = ii;
                                        if (cc < -1) {
                                            ii_b++;
                                            cc++;
                                        }
                                        jj_b = jj + cc;
                                        mm = vv[ii * Size + jj];
                                    }
                                }
                            }
                            if ((ii > 0) && (ii < Size - 1) && (jj == Size - 1)) {
                                if ((Fld[ii + 1][jj - 2] == -theCol) &&
                                    (Fld[ii + 1][jj] == 0) && (Fld[ii + 1][jj - 1] == 0) && (Fld[ii][jj - 1] == 0) && (Fld[ii - 1][jj] == 0)) {
                                    ii_b = ii;
                                    jj_b = jj;
                                    mm = vv[ii * Size + jj];
                                }
                            }
                        } else { //blue
                            if ((jj > 3) && (jj < Size - 1) && (ii > 0) && (ii < 3)) {
                                if (Fld[ii + 2][jj - 1] == -theCol) {
                                    cc = CanConnectFarBorder(ii + 2, jj - 1, -theCol);
                                    if (cc < 2) {
                                        jj_b = jj;
                                        if (cc < -1) {
                                            jj_b--;
                                            cc++;
                                        }
                                        ii_b = ii - cc;
                                        mm = vv[ii * Size + jj];
                                    }
                                }
                            }
                            if ((jj > 0) && (jj < Size - 1) && (ii == 0)) {
                                if ((Fld[ii + 2][jj - 1] == -theCol) &&
                                    (Fld[ii][jj - 1] == 0) && (Fld[ii + 1][jj - 1] == 0) && (Fld[ii + 1][jj] == 0) && (Fld[ii][jj + 1] == 0)) {
                                    ii_b = ii;
                                    jj_b = jj;
                                    mm = vv[ii * Size + jj];
                                }
                            }
                            if ((jj > 0) && (jj < Size - 4) && (ii < Size - 1) && (ii > Size - 4)) {
                                if (Fld[ii - 2][jj + 1] == -theCol) {
                                    cc = CanConnectFarBorder(ii - 2, jj + 1, -theCol);
                                    if (cc < 2) {
                                        jj_b = jj;
                                        if (cc < -1) {
                                            jj_b++;
                                            cc++;
                                        }
                                        ii_b = ii + cc;
                                        mm = vv[ii * Size + jj];
                                    }
                                }
                            }
                            if ((jj > 0) && (jj < Size - 1) && (ii == Size - 1)) {
                                if ((Fld[ii - 2][jj + 1] == -theCol) &&
                                    (Fld[ii][jj + 1] == 0) && (Fld[ii - 1][jj + 1] == 0) && (Fld[ii - 1][jj] == 0) && (Fld[ii][jj - 1] == 0)) {
                                    ii_b = ii;
                                    jj_b = jj;
                                    mm = vv[ii * Size + jj];
                                }
                            }
                        }
                    }
                }
            }
        }

        return [jj_b, ii_b];
    };

    // Initialize the entire game
    function init() {
        var ii, jj;
        for (ii = 0; ii < Size; ii++) {
            for (jj = 0; jj < Size; jj++)
                Fld[ii][jj] = 0;
        }
        // updatePot(theComputerLevel); // Do not compute "pot" on init

        isStart = false;
        isOver = false;

        Start0 = true;
        MoveCount = 0;
        MaxMoveCount = 0;

        currentMove = WHO_RED;
    }

    function updatePot(level) {
        var map={};
        let ii, jj;

        for (ii = 0; ii < Size; ii++) {
            map[''+Fld[ii][0]]={};
            for (jj = 0; jj < Size; jj++) {
                if (Fld[ii][0] == 0) map[''+Fld[ii][0]][''+Fld[jj][0]]=128; //blue border
                else {
                    if (Fld[ii][0] > 0) map[''+Fld[ii][0]][''+Fld[jj][0]]=0; // If it is own piece, set its path length to 0
                }
            }
        }
        const graph=new dijkstra(map);

        for (ii = 0; ii < Size; ii++) {
            for (jj = 0; jj < Size; jj++) {
                Pot[ii][jj][0]=graph.findShortestPath(''+Fld[ii][0],''+Fld[jj][0]);
            }
        }

        return GetPot(level);
    }

    // Let AI get the next move based on the selected level; lower levels reduce accuracy
    // Turn into FF (points connected to the edge), pot[][] becomes [20000, 20000, 0, 1248]
    // Only Bridge[0] differs from others; others are the same when no moves placed, after a move, Bridge[][0] and [1] become 0
    function GetPot(llevel) {
        var ii, jj, kk, mm, mmp, nn, bb, dd = 128;
        //    ActiveColor = ((MoveCount + 1 + Start0) % 2) * 2 - 1;
        ActiveColor = WHO_RED === currentMove ? -1 : 1;
        // Fld: our pieces are -1, computer’s pieces are 1, empty is 0
        for (ii = 0; ii < Size; ii++) {
            for (jj = 0; jj < Size; jj++) {
                for (kk = 0; kk < 4; kk++) {
                    Pot[ii][jj][kk] = 20000;
                    // bridge (Array[11]) no big changes from 1-9, but positions 0 and 10 set to 0 if pieces on top/bottom edges
                    Bridge[ii][jj][kk] = 0;
                }
            }
        }
        // Set default path length for edges
        // Unoccupied positions set to dd=128
        // If own piece, set to 0 (connected, shortest path = 0)
        // If opponent’s piece, leave default 20000 (path length infinite)
        for (ii = 0; ii < Size; ii++) {
            if (Fld[ii][0] == 0) Pot[ii][0][0] = dd; //blue border
            else {
                if (Fld[ii][0] > 0) Pot[ii][0][0] = 0; // If it is your own piece, set its path length to 0
            }
            if (Fld[ii][Size - 1] == 0) Pot[ii][Size - 1][1] = dd; //blue border
            else {
                if (Fld[ii][Size - 1] > 0) Pot[ii][Size - 1][1] = 0;
            }
        }
        for (jj = 0; jj < Size; jj++) {
            if (Fld[0][jj] == 0) Pot[0][jj][2] = dd; //red border
            else {
                if (Fld[0][jj] < 0) Pot[0][jj][2] = 0;
            }
            if (Fld[Size - 1][jj] == 0) Pot[Size - 1][jj][3] = dd; //red border
            else {
                if (Fld[Size - 1][jj] < 0) Pot[Size - 1][jj][3] = 0;
            }
        }
        for (kk = 0; kk < 2; kk++) //blue potential
        {
            for (ii = 0; ii < Size; ii++) {
                for (jj = 0; jj < Size; jj++)
                    Upd[ii][jj] = true;
            }
            nn = 0;
            do {
                nn++;
                bb = 0; // bb represents the number of move points whose weights were modified in each iteration
                // Forward iteration: from left to right
                for (ii = 0; ii < Size; ii++) {
                    for (jj = 0; jj < Size; jj++) {
                        if (Upd[ii][jj]) bb += SetPot(ii, jj, kk, 1, llevel);
                    }
                }
                //逆向迭代 从右到左
                for (ii = Size - 1; ii >= 0; ii--) {
                    for (jj = Size - 1; jj >= 0; jj--) {
                        if (Upd[ii][jj]) bb += SetPot(ii, jj, kk, 1, llevel);
                    }
                }
            }
            while ((bb > 0) && (nn < 12));
            // If no weights were modified in this iteration, it means the weight calculation is complete and iteration ends
            // (No modification means forward and backward iteration results are the same)
            // Number of iterations does not exceed 12
        }
        for (kk = 2; kk < 4; kk++) //red potential
        {
            for (ii = 0; ii < Size; ii++) {
                for (jj = 0; jj < Size; jj++)
                    Upd[ii][jj] = true;
            }
            nn = 0;
            do {
                nn++;
                bb = 0;
                for (ii = 0; ii < Size; ii++) {
                    for (jj = 0; jj < Size; jj++) {
                        if (Upd[ii][jj]) bb += SetPot(ii, jj, kk, -1, llevel);
                    }
                }
                for (ii = Size - 1; ii >= 0; ii--) {
                    for (jj = Size - 1; jj >= 0; jj--) {
                        if (Upd[ii][jj]) bb += SetPot(ii, jj, kk, -1, llevel);
                    }
                }
            }
            while ((bb > 0) && (nn < 12));
        }
    }



    // Calculate shortest paths and store in Pot
    // 20000 means no connection (infinite distance)
    // 30000 means this vertex does not exist (infinite distance), used in vv
    function SetPot(ii, jj, kk, cc, llevel) { // cc=1
        const vv = new Array(6); // Path lengths from each point in a counterclockwise circle starting at the bottom-right piece to the edge
        const tt = new Array(6);

        Upd[ii][jj] = false;
        Bridge[ii][jj][kk] = 0;
        if (Fld[ii][jj] == -cc) return (0); // If it’s the opponent’s piece, return immediately, use default 20000 without shortest path calculation
        var ll, mm, ddb = 0,
            nn, oo = 0,
            dd = 140, // dd is the default path length if this point is empty
            bb = 66;
        if (cc != ActiveColor) bb = 52;
        //vv array(121)
        // potval returns weight if no piece placed
        // returns 30000 if piece placed
        // c: add neighboring nodes
        vv[0] = PotVal(ii + 1, jj, kk, cc); // Starting from the bottom-right piece, get path lengths of six surrounding points to the edge in counterclockwise order and store in vv
        vv[1] = PotVal(ii, jj + 1, kk, cc);
        vv[2] = PotVal(ii - 1, jj + 1, kk, cc);
        vv[3] = PotVal(ii - 1, jj, kk, cc);
        vv[4] = PotVal(ii, jj - 1, kk, cc);
        vv[5] = PotVal(ii + 1, jj - 1, kk, cc);
        for (ll = 0; ll < 6; ll++) {
            if ((vv[ll] >= 30000) && (vv[(ll + 2) % 6] >= 30000)) { // If the pot value of the point one piece away is greater than or equal to 30000 (unreachable)
                if (vv[(ll + 1) % 6] < 0)
                    ddb = +32;
                else
                    vv[(ll + 1) % 6] += 128; //512;
            }
        }
        for (ll = 0; ll < 6; ll++) {
            if ((vv[ll] >= 30000) && (vv[(ll + 3) % 6] >= 30000)) { // If the pot value of the symmetric piece is greater than or equal to 30000 (unreachable)
                ddb += 30;
            }
        }
        mm = 30000;
        for (ll = 0; ll < 6; ll++) {
            if (vv[ll] < 0) {
                vv[ll] += 30000;
                tt[ll] = 10;
            } else
                tt[ll] = 1;
            if (mm > vv[ll])
                mm = vv[ll]; //mm为边缘点权值最小的值
        }
        nn = 0;
        for (ll = 0; ll < 6; ll++) {
            if (vv[ll] == mm) nn += tt[ll]; //nn为边缘权值最小的点的个数
        }
        if (llevel > 4) {
            Bridge[ii][jj][kk] = nn / 5;
            if ((nn >= 2) && (nn < 10)) {
                Bridge[ii][jj][kk] = bb + nn - 2;
                mm -= 32;
            }
            if (nn < 2) {
                oo = 30000;
                for (ll = 0; ll < 6; ll++) {
                    if ((vv[ll] > mm) && (oo > vv[ll]))
                        oo = vv[ll];
                }
                if (oo <= mm + 104) {
                    Bridge[ii][jj][kk] = bb - (oo - mm) / 4;
                    mm -= 64;
                }
                mm += oo;
                mm /= 2;
            }
        }

        if ((ii > 0) && (ii < Size - 1) && (jj > 0) && (jj < Size - 1))
            Bridge[ii][jj][kk] += ddb;
        else
            Bridge[ii][jj][kk] -= 2;
        if (((ii == 0) || (ii == Size - 1)) && ((jj == 0) || (jj == Size - 1)))
            Bridge[ii][jj][kk] /= 2; // /=4
        if (Bridge[ii][jj][kk] > 68)
            Bridge[ii][jj][kk] = 68; //66

        //如果是自己落子
        if (Fld[ii][jj] == cc) {
            //修改权值并返回
            if (mm < Pot[ii][jj][kk]) { //计算的小于当前的
                Pot[ii][jj][kk] = mm;
                //修改周围六个落子点的遍历标志为true 再次遍历
                SetUpd(ii + 1, jj, cc);
                SetUpd(ii, jj + 1, cc);
                SetUpd(ii - 1, jj + 1, cc);
                SetUpd(ii - 1, jj, cc);
                SetUpd(ii, jj - 1, cc);
                SetUpd(ii + 1, jj - 1, cc);
                //返回表示修改过遍历标志 需要再次迭代
                return (1);
            }
            return (0);
        }
        // 如果没有落子
        if (mm + dd < Pot[ii][jj][kk]) {
            //修改权值并返回
            Pot[ii][jj][kk] = mm + dd;
            SetUpd(ii + 1, jj, cc);
            SetUpd(ii, jj + 1, cc);
            SetUpd(ii - 1, jj + 1, cc);
            SetUpd(ii - 1, jj, cc);
            SetUpd(ii, jj - 1, cc);
            SetUpd(ii + 1, jj - 1, cc);
            return (1);
        }
        return (0);
    }
    //每个棋子位的权值
    function PotVal(ii, jj, kk, cc) {
        if (ii < 0) return (30000);
        if (jj < 0) return (30000);
        if (ii >= Size) return (30000);
        if (jj >= Size) return (30000);
        if (Fld[ii][jj] == 0) return (Pot[ii][jj][kk]); //如果没有落子
        if (Fld[ii][jj] == -cc) return (30000); //如果对方落子
        return (Pot[ii][jj][kk] - 30000); //如果我方落子 直接为负值
    }

    function SetUpd(ii, jj, cc) {
        if (ii < 0) return;
        if (jj < 0) return;
        if (ii >= Size) return;
        if (jj >= Size) return;
        Upd[ii][jj] = true;
    }

    function CanConnectFarBorder(nn, mm, cc) {
        var ii, jj;
        if (cc > 0) //blue
        {
            if (2 * mm < Size - 1) {
                for (ii = 0; ii < Size; ii++) {
                    for (jj = 0; jj < mm; jj++) {
                        if ((jj - ii < mm - nn) && (ii + jj <= nn + mm) && (Fld[ii][jj] != 0)) return (2);
                    }
                }
                if (Fld[nn - 1][mm] == -cc) return (0);
                if (Fld[nn - 1][mm - 1] == -cc) {
                    if (GetFld(nn + 2, mm - 1) == -cc) return (0);
                    return (-1);
                }
                if (GetFld(nn + 2, mm - 1) == -cc) return (-2);
            } else {
                for (ii = 0; ii < Size; ii++) {
                    for (jj = Size - 1; jj > mm; jj--) {
                        if ((jj - ii > mm - nn) && (ii + jj >= nn + mm) && (Fld[ii][jj] != 0)) return (2);
                    }
                }
                if (Fld[nn + 1][mm] == -cc) return (0);
                if (Fld[nn + 1][mm + 1] == -cc) {
                    if (GetFld(nn - 2, mm + 1) == -cc) return (0);
                    return (-1);
                }
                if (GetFld(nn - 2, mm + 1) == -cc) return (-2);
            }
        } else {
            if (2 * nn < Size - 1) {
                for (jj = 0; jj < Size; jj++) {
                    for (ii = 0; ii < nn; ii++) {
                        if ((ii - jj < nn - mm) && (ii + jj <= nn + mm) && (Fld[ii][jj] != 0)) return (2);
                    }
                }
                if (Fld[nn][mm - 1] == -cc) return (0);
                if (Fld[nn - 1][mm - 1] == -cc) {
                    if (GetFld(nn - 1, mm + 2) == -cc) return (0);
                    return (-1);
                }
                if (GetFld(nn - 1, mm + 2) == -cc) return (-2);
            } else {
                for (jj = 0; jj < Size; jj++) {
                    for (ii = Size - 1; ii > nn; ii--) {
                        if ((ii - jj > nn - mm) && (ii + jj >= nn + mm) && (Fld[ii][jj] != 0)) return (2);
                    }
                }
                if (Fld[nn][mm + 1] == -cc) return (0);
                if (Fld[nn + 1][mm + 1] == -cc) {
                    if (GetFld(nn + 1, mm - 2) == -cc) return (0);
                    return (-1);
                }
                if (GetFld(nn + 1, mm - 2) == -cc) return (-2);
            }
        }
        return (1);
    }
    //CanConnectFarBorder的辅助函数
    function GetFld(ii, jj) {
        if (ii < 0) return (-1);
        if (jj < 0) return (1);
        if (ii >= Size) return (-1);
        if (jj >= Size) return (1);
        return (Fld[ii][jj]);
    }
};
