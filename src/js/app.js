document.addEventListener('DOMContentLoaded', () => {

    setupNavigation();
    setupBankrollSettings();
    setupBankrollChart();
    updateDashboard();
    loadSettings();

});


/* =========================
   FORMATAÇÃO
========================== */

function formatMoney(value) {

    return new Intl.NumberFormat('pt-PT', {

        style: 'currency',

        currency: 'EUR'

    }).format(Number(value));

}


function formatPercent(value) {

    return `${Number(value)
        .toFixed(2)
        .replace('.', ',')}%`;

}


/* =========================
   DASHBOARD
========================== */

function updateDashboard() {

    const bankrollData =
        Bankroll.get();


    const bets =
        typeof Bets !== 'undefined'
            ? Bets.getAll()
            : [];


    /* =========================
       LUCRO REALIZADO
    ========================== */

    const totalProfit =
        bets.reduce(
            (total, bet) => {

                if (
                    bet.status === 'won' ||
                    bet.status === 'lost'
                ) {

                    return total +
                        Number(bet.profit || 0);

                }

                return total;

            },
            0
        );


    /* =========================
       STAKE RESOLVIDA
    ========================== */

    const totalStake =
        bets.reduce(
            (total, bet) => {

                if (
                    bet.status === 'won' ||
                    bet.status === 'lost'
                ) {

                    return total +
                        Number(bet.stake || 0);

                }

                return total;

            },
            0
        );


    /* =========================
       STAKE PENDENTE
    ========================== */

    const pendingStake =
        bets.reduce(
            (total, bet) => {

                if (bet.status === 'pending') {

                    return total +
                        Number(bet.stake || 0);

                }

                return total;

            },
            0
        );


    /* =========================
       ROI
    ========================== */

    const roi =
        totalStake > 0
            ? (totalProfit / totalStake) * 100
            : 0;


    /* =========================
       BANCA TOTAL
    ========================== */

    const currentBankroll =
        Number(bankrollData.initialBankroll) +
        totalProfit;


    /* =========================
       BANCA DISPONÍVEL
    ========================== */

    const availableBankroll =
        currentBankroll -
        pendingStake;


    /* =========================
       EXPOSIÇÃO
    ========================== */

    const exposure =
        currentBankroll > 0
            ? (pendingStake / currentBankroll) * 100
            : 0;


    /* =========================
       BANCA
    ========================== */

    const bankrollElements =
        document.querySelectorAll(
            '[data-bankroll]'
        );


    bankrollElements.forEach(element => {

        element.textContent =
            formatMoney(currentBankroll);

    });


    /* =========================
       BANCA DISPONÍVEL
    ========================== */

    const availableElement =
        document.querySelector(
            '[data-available-bankroll]'
        );


    if (availableElement) {

        availableElement.textContent =
            formatMoney(availableBankroll);

    }


    /* =========================
       EM APOSTAS
    ========================== */

    const pendingStakeElement =
        document.querySelector(
            '[data-pending-stake]'
        );


    if (pendingStakeElement) {

        pendingStakeElement.textContent =
            formatMoney(pendingStake);

    }


    /* =========================
       EXPOSIÇÃO
    ========================== */

    const exposureElement =
        document.querySelector(
            '[data-exposure]'
        );


    if (exposureElement) {

        exposureElement.textContent =
            formatPercent(exposure);

    }


    /* =========================
       LUCRO
    ========================== */

    const profitElement =
        document.querySelector(
            '[data-profit]'
        );


    if (profitElement) {

        profitElement.textContent =
            formatMoney(totalProfit);

    }


    /* =========================
       ROI
    ========================== */

    const roiElement =
        document.querySelector(
            '[data-roi]'
        );


    if (roiElement) {

        roiElement.textContent =
            formatPercent(roi);

    }


    /* =========================
       NÚMERO DE APOSTAS
    ========================== */

    const betsElement =
        document.querySelector(
            '[data-bets]'
        );


    if (betsElement) {

        betsElement.textContent =
            bets.length;

    }


    /* =========================
       ÚLTIMAS APOSTAS
    ========================== */

    renderDashboardBets(bets);


    /* =========================
       GRÁFICO
    ========================== */

    renderBankrollChart(
        bets,
        Number(bankrollData.initialBankroll)
    );

}


/* =========================
   HISTÓRICO DA BANCA
========================== */

function getBankrollHistory() {

    const bankrollData =
        Bankroll.get();


    const bets =
        typeof Bets !== 'undefined'
            ? Bets.getAll()
            : [];


    const initialBankroll =
        Number(
            bankrollData.initialBankroll
        ) || 0;


    const resolvedBets =
        bets
            .filter(
                bet =>
                    bet.status === 'won' ||
                    bet.status === 'lost'
            )
            .map(
                bet => ({

                    date:
                        bet.date ||
                        bet.createdAt ||
                        new Date().toISOString(),

                    profit:
                        Number(
                            bet.profit || 0
                        )

                })
            )
            .sort(
                (a, b) =>
                    new Date(a.date) -
                    new Date(b.date)
            );


    const history = [];


    let bankroll =
        initialBankroll;


    /* =========================
       PONTO INICIAL
    ========================== */

    history.push({

        date:
            new Date(
                `${getInitialBankrollDate(
                    resolvedBets
                )}T00:00:00`
            ),

        bankroll

    });


    /* =========================
       EVOLUÇÃO
    ========================== */

    resolvedBets.forEach(
        bet => {

            bankroll +=
                bet.profit;


            history.push({

                date:
                    new Date(
                        `${normalizeBetDate(
                            bet.date
                        )}T00:00:00`
                    ),

                bankroll

            });

        }
    );


    return history;

}


/* =========================
   DATA INICIAL
========================== */

function getInitialBankrollDate(
    resolvedBets
) {

    if (
        resolvedBets.length > 0
    ) {

        return normalizeBetDate(
            resolvedBets[0].date
        );

    }


    return getTodayDate();

}


/* =========================
   NORMALIZAR DATA
========================== */

function normalizeBetDate(date) {

    if (!date) {

        return getTodayDate();

    }


    if (
        typeof date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {

        return date;

    }


    const parsed =
        new Date(date);


    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {

        return getTodayDate();

    }


    return [

        parsed.getFullYear(),

        String(
            parsed.getMonth() + 1
        ).padStart(2, '0'),

        String(
            parsed.getDate()
        ).padStart(2, '0')

    ].join('-');

}


/* =========================
   DATA DE HOJE
========================== */

function getTodayDate() {

    const today =
        new Date();


    return [

        today.getFullYear(),

        String(
            today.getMonth() + 1
        ).padStart(2, '0'),

        String(
            today.getDate()
        ).padStart(2, '0')

    ].join('-');

}


/* =========================
   CONFIGURAR GRÁFICO
========================== */

function setupBankrollChart() {

    const periodSelect =
        document.getElementById(
            'bankroll-chart-period'
        );


    if (periodSelect) {

        periodSelect.addEventListener(
            'change',
            () => {

                renderBankrollChart();

            }
        );

    }


    window.addEventListener(
        'resize',
        () => {

            renderBankrollChart();

        }
    );


    renderBankrollChart();

}


/* =========================
   RENDERIZAR GRÁFICO
========================== */

function renderBankrollChart() {

    const canvas =
        document.getElementById(
            'bankroll-chart'
        );


    const emptyState =
        document.getElementById(
            'bankroll-chart-empty'
        );


    const periodSelect =
        document.getElementById(
            'bankroll-chart-period'
        );


    if (!canvas) {

        return;

    }


    const history =
        getBankrollHistory();


    if (
        history.length < 2
    ) {

        canvas.style.display =
            'none';


        if (emptyState) {

            emptyState.style.display =
                'flex';

        }


        return;

    }


    const period =
        periodSelect
            ? periodSelect.value
            : '30';


    let filteredHistory =
        [...history];


    /* =========================
       FILTRO DE PERÍODO
    ========================== */

    if (
        period !== 'all'
    ) {

        const days =
            Number(period);


        const cutoff =
            new Date();


        cutoff.setHours(
            0,
            0,
            0,
            0
        );


        cutoff.setDate(
            cutoff.getDate() - days
        );


        filteredHistory =
            history.filter(
                point =>
                    point.date >= cutoff
            );


        /*
         * Manter o último ponto
         * anterior ao período.
         */

        const previousPoints =
            history.filter(
                point =>
                    point.date < cutoff
            );


        if (
            previousPoints.length > 0 &&
            filteredHistory.length > 0
        ) {

            filteredHistory.unshift(
                previousPoints[
                    previousPoints.length - 1
                ]
            );

        }

    }


    if (
        filteredHistory.length < 2
    ) {

        canvas.style.display =
            'none';


        if (emptyState) {

            emptyState.style.display =
                'flex';


            const paragraph =
                emptyState.querySelector('p');


            if (paragraph) {

                paragraph.textContent =
                    'Não existem apostas resolvidas neste período.';

            }

        }


        return;

    }


    canvas.style.display =
        'block';


    if (emptyState) {

        emptyState.style.display =
            'none';

    }


    drawBankrollChart(
        canvas,
        filteredHistory
    );

}


/* =========================
   DESENHAR GRÁFICO
========================== */

function drawBankrollChart(
    canvas,
    history
) {

    const container =
        canvas.parentElement;


    if (!container) {

        return;

    }


    const width =
        container.clientWidth;


    const height =
        container.clientHeight;


    if (
        width <= 0 ||
        height <= 0
    ) {

        return;

    }


    const devicePixelRatio =
        window.devicePixelRatio || 1;


    canvas.width =
        width * devicePixelRatio;


    canvas.height =
        height * devicePixelRatio;


    canvas.style.width =
        `${width}px`;


    canvas.style.height =
        `${height}px`;


    const ctx =
        canvas.getContext('2d');


    ctx.setTransform(
        devicePixelRatio,
        0,
        0,
        devicePixelRatio,
        0,
        0
    );


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    /* =========================
       MARGENS
    ========================== */

    const padding = {

        top: 25,

        right: 25,

        bottom: 35,

        left: 65

    };


    const chartWidth =
        width -
        padding.left -
        padding.right;


    const chartHeight =
        height -
        padding.top -
        padding.bottom;


    /* =========================
       VALORES
    ========================== */

    const values =
        history.map(
            point =>
                point.bankroll
        );


    let minValue =
        Math.min(...values);


    let maxValue =
        Math.max(...values);


    if (
        minValue === maxValue
    ) {

        minValue -= 10;

        maxValue += 10;

    }


    const range =
        maxValue -
        minValue;


    const extra =
        range * 0.15;


    minValue -= extra;

    maxValue += extra;


    /* =========================
       COORDENADAS
    ========================== */

    const getX =
        index => {

            if (
                history.length === 1
            ) {

                return padding.left;

            }


            return (
                padding.left +
                (
                    index /
                    (history.length - 1)
                ) *
                chartWidth
            );

        };


    const getY =
        value =>
            padding.top +
            (
                (maxValue - value) /
                (maxValue - minValue)
            ) *
            chartHeight;


    /* =========================
       GRELHA
    ========================== */

    const gridLines =
        4;


    ctx.font =
        '12px Arial';


    ctx.textAlign =
        'right';


    ctx.textBaseline =
        'middle';


    for (
        let i = 0;
        i <= gridLines;
        i++
    ) {

        const value =
            minValue +
            (
                (maxValue - minValue) *
                (
                    1 -
                    i / gridLines
                )
            );


        const y =
            padding.top +
            (
                i /
                gridLines
            ) *
            chartHeight;


        ctx.beginPath();


        ctx.moveTo(
            padding.left,
            y
        );


        ctx.lineTo(
            width - padding.right,
            y
        );


        ctx.strokeStyle =
            '#e5e7eb';


        ctx.lineWidth =
            1;


        ctx.stroke();


        ctx.fillStyle =
            '#6b7280';


        ctx.fillText(
            formatMoney(value),
            padding.left - 10,
            y
        );

    }


    /* =========================
       LINHA
    ========================== */

    ctx.beginPath();


    history.forEach(
        (point, index) => {

            const x =
                getX(index);


            const y =
                getY(
                    point.bankroll
                );


            if (
                index === 0
            ) {

                ctx.moveTo(
                    x,
                    y
                );

            } else {

                ctx.lineTo(
                    x,
                    y
                );

            }

        }
    );


    ctx.strokeStyle =
        '#2563eb';


    ctx.lineWidth =
        3;


    ctx.lineJoin =
        'round';


    ctx.lineCap =
        'round';


    ctx.stroke();


    /* =========================
       PONTOS
    ========================== */

    history.forEach(
        (point, index) => {

            const x =
                getX(index);


            const y =
                getY(
                    point.bankroll
                );


            ctx.beginPath();


            ctx.arc(
                x,
                y,
                4,
                0,
                Math.PI * 2
            );


            ctx.fillStyle =
                '#ffffff';


            ctx.fill();


            ctx.strokeStyle =
                '#2563eb';


            ctx.lineWidth =
                2;


            ctx.stroke();

        }
    );


    /* =========================
       DATAS
    ========================== */

    ctx.fillStyle =
        '#6b7280';


    ctx.font =
        '11px Arial';


    ctx.textAlign =
        'center';


    ctx.textBaseline =
        'top';


    const first =
        history[0];


    const last =
        history[
            history.length - 1
        ];


    ctx.fillText(
        formatChartDate(
            first.date
        ),
        padding.left,
        height -
        padding.bottom +
        10
    );


    ctx.fillText(
        formatChartDate(
            last.date
        ),
        width -
        padding.right,
        height -
        padding.bottom +
        10
    );

}


/* =========================
   DATA DO GRÁFICO
========================== */

function formatChartDate(date) {

    if (!date) {

        return '';

    }


    return new Intl.DateTimeFormat(
        'pt-PT',
        {
            day: '2-digit',
            month: '2-digit'
        }
    ).format(
        date
    );

}


/* =========================
   ÚLTIMAS APOSTAS
========================== */

function renderDashboardBets(bets) {

    const dashboardPanel =
        document.querySelector(
            '#dashboard-page .content-grid .panel:nth-child(2)'
        );


    if (!dashboardPanel) {

        return;

    }


    const emptyState =
        dashboardPanel.querySelector(
            '.empty-state'
        );


    const existingList =
        dashboardPanel.querySelector(
            '.dashboard-bets-list'
        );


    if (
        bets.length === 0
    ) {

        if (emptyState) {

            emptyState.style.display =
                'flex';

        }


        if (existingList) {

            existingList.remove();

        }


        return;

    }


    if (emptyState) {

        emptyState.style.display =
            'none';

    }


    const recentBets =
        bets.slice(0, 5);


    let list =
        existingList;


    if (!list) {

        list =
            document.createElement(
                'div'
            );


        list.className =
            'dashboard-bets-list';


        dashboardPanel.appendChild(
            list
        );

    }


    list.innerHTML =
        '';


    recentBets.forEach(
        bet => {

            const item =
                document.createElement(
                    'div'
                );


            item.className =
                'dashboard-bet-item';


            let statusText =
                'Pendente';


            let statusClass =
                'pending';


            if (
                bet.status === 'won'
            ) {

                statusText =
                    'Ganha';

                statusClass =
                    'won';

            }


            if (
                bet.status === 'lost'
            ) {

                statusText =
                    'Perdida';

                statusClass =
                    'lost';

            }


            item.innerHTML = `

                <div class="dashboard-bet-main">

                    <strong>

                        ${escapeHtml(
                            bet.homeTeam
                        )}

                        <span>vs</span>

                        ${escapeHtml(
                            bet.awayTeam
                        )}

                    </strong>


                    <small>

                        ${escapeHtml(
                            bet.selection
                        )}

                        @

                        ${Number(
                            bet.odds
                        ).toFixed(2)}

                    </small>

                </div>


                <div class="dashboard-bet-right">

                    <strong>

                        ${formatMoney(
                            bet.stake
                        )}

                    </strong>


                    <span
                        class="status ${statusClass}"
                    >

                        ${statusText}

                    </span>

                </div>

            `;


            list.appendChild(
                item
            );

        }
    );

}


/* =========================
   NAVEGAÇÃO
========================== */

function setupNavigation() {

    const navItems =
        document.querySelectorAll(
            '.nav-item[data-page]'
        );


    navItems.forEach(
        item => {

            item.addEventListener(
                'click',
                () => {

                    const page =
                        item.dataset.page;


                    showPage(page);


                    navItems.forEach(
                        navItem => {

                            navItem.classList.remove(
                                'active'
                            );

                        }
                    );


                    item.classList.add(
                        'active'
                    );


                    if (
                        page === 'dashboard'
                    ) {

                        updateDashboard();

                    }


                    if (
                        page === 'statistics'
                    ) {

                        updateStatistics();

                    }

                }
            );

        }
    );

}


/* =========================
   MOSTRAR PÁGINA
========================== */

function showPage(page) {

    const pages = {

        dashboard:
            document.getElementById(
                'dashboard-page'
            ),

        bets:
            document.getElementById(
                'bets-page'
            ),

        statistics:
            document.getElementById(
                'statistics-page'
            ),

        settings:
            document.getElementById(
                'settings-page'
            ),

        'value-bets':
            document.getElementById(
                'value-bets-page'
            )

    };


    Object.values(pages)
        .forEach(
            pageElement => {

                if (pageElement) {

                    pageElement.style.display =
                        'none';

                }

            }
        );


    if (pages[page]) {

        pages[page].style.display =
            'block';

    }


    if (page === 'statistics') {

        updateStatistics();

    }

}


/* =========================
   DEFINIÇÕES DA BANCA
========================== */

function setupBankrollSettings() {

    const saveButton =
        document.getElementById(
            'save-bankroll'
        );


    if (!saveButton) {

        return;

    }


    saveButton.addEventListener(
        'click',
        () => {

            const input =
                document.getElementById(
                    'initial-bankroll'
                );


            const message =
                document.getElementById(
                    'settings-message'
                );


            const amount =
                Number(
                    input.value
                );


            if (
                !Number.isFinite(amount) ||
                amount < 0
            ) {

                message.textContent =
                    'Introduz um valor de banca válido.';


                message.className =
                    'settings-message error';


                return;

            }


            try {

                Bankroll.setInitialBankroll(
                    amount
                );


                updateDashboard();


                message.textContent =
                    `Banca definida para ${formatMoney(
                        amount
                    )}.`;


                message.className =
                    'settings-message success';


            } catch (error) {

                console.error(
                    error
                );


                message.textContent =
                    'Ocorreu um erro ao guardar a banca.';


                message.className =
                    'settings-message error';

            }

        }
    );

}


/* =========================
   CARREGAR DEFINIÇÕES
========================== */

function loadSettings() {

    const input =
        document.getElementById(
            'initial-bankroll'
        );


    if (!input) {

        return;

    }


    const data =
        Bankroll.get();


    input.value =
        data.initialBankroll;

}


/* =========================
   ESCAPE HTML
========================== */

function escapeHtml(value) {

    const div =
        document.createElement(
            'div'
        );


    div.textContent =
        value;


    return div.innerHTML;

}


/* =========================
   ESTATÍSTICAS
========================== */

function updateStatistics() {

    if (
        typeof Bets === 'undefined'
    ) {

        return;

    }


    const bets =
        Bets.getAll();


    const resolvedBets =
        bets.filter(
            bet =>
                bet.status === 'won' ||
                bet.status === 'lost'
        );


    const wonBets =
        resolvedBets.filter(
            bet =>
                bet.status === 'won'
        );


    const lostBets =
        resolvedBets.filter(
            bet =>
                bet.status === 'lost'
        );


    const pendingBets =
        bets.filter(
            bet =>
                bet.status === 'pending'
        );


    /* =========================
       VALORES BASE
    ========================== */

    const total =
        bets.length;


    const won =
        wonBets.length;


    const lost =
        lostBets.length;


    const pending =
        pendingBets.length;


    const totalProfit =
        resolvedBets.reduce(
            (total, bet) =>
                total +
                Number(
                    bet.profit || 0
                ),
            0
        );


    const totalStake =
        resolvedBets.reduce(
            (total, bet) =>
                total +
                Number(
                    bet.stake || 0
                ),
            0
        );


    const pendingStake =
        pendingBets.reduce(
            (total, bet) =>
                total +
                Number(
                    bet.stake || 0
                ),
            0
        );


    const hitRate =
        resolvedBets.length > 0
            ? (
                won /
                resolvedBets.length
            ) * 100
            : 0;


    const roi =
        totalStake > 0
            ? (
                totalProfit /
                totalStake
            ) * 100
            : 0;


    const averageOdds =
        bets.length > 0
            ? bets.reduce(
                (total, bet) =>
                    total +
                    Number(
                        bet.odds || 0
                    ),
                0
            ) / bets.length
            : 0;


    const averageStake =
        bets.length > 0
            ? bets.reduce(
                (total, bet) =>
                    total +
                    Number(
                        bet.stake || 0
                    ),
                0
            ) / bets.length
            : 0;


    /* =========================
       MELHOR / PIOR
    ========================== */

    const profits =
        resolvedBets.map(
            bet =>
                Number(
                    bet.profit || 0
                )
        );


    const bestProfit =
        profits.length > 0
            ? Math.max(...profits)
            : 0;


    const worstLoss =
        profits.length > 0
            ? Math.min(...profits)
            : 0;


    /* =========================
       ATUALIZAR CARDS
    ========================== */

    setStatisticValue(
        'data-stat-total',
        total
    );


    setStatisticValue(
        'data-stat-won',
        won
    );


    setStatisticValue(
        'data-stat-lost',
        lost
    );


    setStatisticValue(
        'data-stat-hit-rate',
        formatPercent(hitRate)
    );


    setStatisticValue(
        'data-stat-profit',
        formatMoney(totalProfit)
    );


    setStatisticValue(
        'data-stat-roi',
        formatPercent(roi)
    );


    setStatisticValue(
        'data-stat-average-odds',
        averageOdds.toFixed(2)
    );


    setStatisticValue(
        'data-stat-average-stake',
        formatMoney(averageStake)
    );


    setStatisticValue(
        'data-stat-best-profit',
        formatMoney(bestProfit)
    );


    setStatisticValue(
        'data-stat-worst-loss',
        formatMoney(worstLoss)
    );


    setStatisticValue(
        'data-stat-pending',
        pending
    );


    setStatisticValue(
        'data-stat-pending-stake',
        formatMoney(pendingStake)
    );


    /* =========================
       TABELAS
    ========================== */

    renderStatisticsTable(
        bets,
        'market',
        'statistics-market-body'
    );


    renderStatisticsTable(
        bets,
        'competition',
        'statistics-competition-body'
    );


    renderStatisticsSummary(
        bets,
        resolvedBets,
        won,
        lost,
        pending,
        totalProfit,
        totalStake,
        hitRate,
        roi
    );

}


/* =========================
   VALOR DE ESTATÍSTICA
========================== */

function setStatisticValue(
    attribute,
    value
) {

    const element =
        document.querySelector(
            `[${attribute}]`
        );


    if (!element) {

        return;

    }


    element.textContent =
        value;

}


/* =========================
   TABELAS DE ESTATÍSTICAS
========================== */

function renderStatisticsTable(
    bets,
    groupBy,
    elementId
) {

    const tbody =
        document.getElementById(
            elementId
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML =
        '';


    const groups =
        {};


    bets.forEach(
        bet => {

            const key =
                String(
                    bet[groupBy] ||
                    'Sem informação'
                ).trim();


            if (!groups[key]) {

                groups[key] = {

                    bets: 0,

                    won: 0,

                    lost: 0,

                    stake: 0,

                    profit: 0

                };

            }


            groups[key].bets++;


            if (
                bet.status === 'won'
            ) {

                groups[key].won++;

            }


            if (
                bet.status === 'lost'
            ) {

                groups[key].lost++;

            }


            if (
                bet.status === 'won' ||
                bet.status === 'lost'
            ) {

                groups[key].stake +=
                    Number(
                        bet.stake || 0
                    );


                groups[key].profit +=
                    Number(
                        bet.profit || 0
                    );

            }

        }
    );


    const entries =
        Object.entries(
            groups
        ).sort(
            (a, b) =>
                b[1].profit -
                a[1].profit
        );


    if (
        entries.length === 0
    ) {

        const row =
            document.createElement(
                'tr'
            );


        row.innerHTML = `

            <td
                colspan="8"
                style="text-align:center;"
            >
                Ainda não existem dados.
            </td>

        `;


        tbody.appendChild(
            row
        );


        return;

    }


    entries.forEach(
        ([name, data]) => {

            const resolved =
                data.won +
                data.lost;


            const hitRate =
                resolved > 0
                    ? (
                        data.won /
                        resolved
                    ) * 100
                    : 0;


            const roi =
                data.stake > 0
                    ? (
                        data.profit /
                        data.stake
                    ) * 100
                    : 0;


            const row =
                document.createElement(
                    'tr'
                );


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(name)}
                    </strong>
                </td>

                <td>
                    ${data.bets}
                </td>

                <td>
                    ${data.won}
                </td>

                <td>
                    ${data.lost}
                </td>

                <td>
                    ${formatPercent(hitRate)}
                </td>

                <td>
                    ${formatMoney(data.stake)}
                </td>

                <td
                    class="${
                        data.profit > 0
                            ? 'profit-positive'
                            : data.profit < 0
                                ? 'profit-negative'
                                : ''
                    }"
                >
                    ${formatMoney(data.profit)}
                </td>

                <td>
                    ${formatPercent(roi)}
                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}


/* =========================
   RESUMO
========================== */

function renderStatisticsSummary(
    bets,
    resolvedBets,
    won,
    lost,
    pending,
    totalProfit,
    totalStake,
    hitRate,
    roi
) {

    const element =
        document.getElementById(
            'statistics-summary'
        );


    if (!element) {

        return;

    }


    const total =
        bets.length;


    const averageProfit =
        resolvedBets.length > 0
            ? totalProfit /
              resolvedBets.length
            : 0;


    const averageStake =
        bets.length > 0
            ? bets.reduce(
                (sum, bet) =>
                    sum +
                    Number(
                        bet.stake || 0
                    ),
                0
            ) / bets.length
            : 0;


    element.innerHTML = `

        <div>
            <strong>
                Performance:
            </strong>

            ${won} ganhas /
            ${lost} perdidas /
            ${pending} pendentes
        </div>


        <div>
            <strong>
                Taxa de acerto:
            </strong>

            ${formatPercent(hitRate)}
        </div>


        <div>
            <strong>
                ROI:
            </strong>

            ${formatPercent(roi)}
        </div>


        <div>
            <strong>
                Lucro médio por aposta resolvida:
            </strong>

            ${formatMoney(
                averageProfit
            )}
        </div>


        <div>
            <strong>
                Stake média:
            </strong>

            ${formatMoney(
                averageStake
            )}
        </div>


        <div>
            <strong>
                Stake total utilizada:
            </strong>

            ${formatMoney(
                totalStake
            )}
        </div>


        <div>
            <strong>
                Total de apostas:
            </strong>

            ${total}
        </div>

    `;

}