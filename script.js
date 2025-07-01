pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const pdfUrl = 'https://tk-0120.github.io/namaiki/pdf/docpass.pdf';

// --- DOM Elements ---
const $loader = $('#loader');
const $title = $('#title');
const $container = $('#container');
const $magazine = $('#magazine');
const $pageNumbers = $('#page-numbers');

// --- Functions ---

function updatePageNumbers(view) {
    if (!view) return;
    $pageNumbers.find('#left-page').text(view[0] || '');
    $pageNumbers.find('#right-page').text(view[1] || '');
}

function setupTurnJs() {
    if ($magazine.data('turn')) {
        $magazine.turn('destroy');
    }
    const isMobile = window.innerWidth < 900;
    const display = isMobile ? 'single' : 'double';
    const width = isMobile ? window.innerWidth : 900;
    const height = isMobile ? window.innerHeight : 600;

    $magazine.turn({
        width: width,
        height: height,
        display: display,
        autoCenter: true,
        gradients: true,
        acceleration: true,
        when: {
            turned: (event, page, view) => updatePageNumbers(view),
        },
    });
    updatePageNumbers($magazine.turn('view'));
}

async function initializeViewer(password) {
    $loader.removeClass('hidden');
    $title.addClass('hidden');

    try {
        const pdf = await pdfjsLib.getDocument({ url: pdfUrl, password: password }).promise;

        const renderPage = async (pageNumber) => {
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            return canvas.toDataURL('image/jpeg');
        };

        for (let i = 1; i <= pdf.numPages; i++) {
            const imageUrl = await renderPage(i);
            const $pageElement = $('<div>').css('background-image', `url(${imageUrl})`);
            $magazine.append($pageElement);
        }

        const $reviewPage = $('<div>').addClass('review-page no-touch');
        const $paragraph = $('<p>').text('商品の感想を教えてください！');
        const $button = $('<button>')
            .addClass('review-button')
            .text('感想を書く'); // 直接イベントを割り当てない
        $reviewPage.append($paragraph).append($button);
        $magazine.append($reviewPage);

        // イベント委譲でボタンのクリックを処理
        $magazine.on('click', '.review-button', function(event) {
            event.stopPropagation(); // turn.jsへのイベント伝播を停止
            window.location.href = 'https://tk-0120.github.io/namaiki/survey.html';
        });

        $loader.addClass('hidden');
        $title.removeClass('hidden');
        $container.removeClass('hidden');
        $pageNumbers.removeClass('hidden');

        setupTurnJs();

    } catch (err) {
        $loader.addClass('hidden');
        $title.removeClass('hidden');
        let errorMessage = '不明なエラーが発生しました。';
        if (err && err.message) {
            errorMessage = err.message;
        } else if (err && err.name) {
            errorMessage = `エラー種別: ${err.name}`;
        }
        alert(`PDFの読み込みに失敗しました。\n\n理由: ${errorMessage}`);
    }
}

// --- Event Handlers ---
let resizeTimeout;
$(window).on('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(setupTurnJs, 250);
}).on('keydown', (e) => {
    if (e.key === 'ArrowLeft') $magazine.turn('previous');
    if (e.key === 'ArrowRight') $magazine.turn('next');
});

$('#prev-button').on('click', () => $magazine.turn('previous'));
$('#next-button').on('click', () => $magazine.turn('next'));

// --- Initialization ---
const password = prompt('PDFのパスワードを入力してください:');
if (password) {
    initializeViewer(password);
} else {
    $title.removeClass('hidden');
}
