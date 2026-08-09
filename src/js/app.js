document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();
});

function formatMoney(value) {
    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
}

function formatPercent(value) {
    return `${value.toFixed(2).replace('.', ',')}%`;
}

function updateDashboard() {
    const data = Bankroll.get();

    const bankrollElements = document.querySelectorAll(
        '[data-bankroll]'
    );

    bankrollElements.forEach(element => {
        element.textContent = formatMoney(
            data.currentBankroll
        );
    });

    const profitElement =
        document.querySelector('[data-profit]');

    if (profitElement) {
        profitElement.textContent =
            formatMoney(data.totalProfit);
    }

    const roiElement =
        document.querySelector('[data-roi]');

    if (roiElement) {
        roiElement.textContent =
            formatPercent(Bankroll.getROI());
    }

    const betsElement =
        document.querySelector('[data-bets]');

    if (betsElement) {
        betsElement.textContent =
            data.totalBets;
    }

    const wonElement =
        document.querySelector('[data-won]');

    if (wonElement) {
        wonElement.textContent =
            data.wonBets;
    }

    const lostElement =
        document.querySelector('[data-lost]');

    if (lostElement) {
        lostElement.textContent =
            data.lostBets;
    }
}