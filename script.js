pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const pdfUrl = 'https://tk-0120.github.io/namaiki/pdf/docpass.pdf';
//const pdfUrl = 'https://digitarod.github.io/book/pdf/doc.pdf';


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
    const imageAspectRatio = 1666 / 2392;

    let width, height;
    if (isMobile) {
        // スマホ表示: 画面に収まるように計算
        const availableWidth = window.innerWidth;
        const availableHeight = window.innerHeight;
        
        // 画面のアスペクト比と比較
        if ((availableWidth / availableHeight) < imageAspectRatio) {
            // 画面が縦長の場合、幅を基準にサイズを決める
            width = availableWidth;
            height = width / imageAspectRatio;
        } else {
            // 画面が横長の場合、高さを基準に計算
            height = availableHeight;
            width = height * imageAspectRatio;
        }
    } else {
        // PC表示: 高さを基準に計算
        height = window.innerHeight * 0.95; // 画面の高さの95%
        const singlePageWidth = height * imageAspectRatio;
        width = singlePageWidth * 2; // 見開きなので2倍
    }

    $magazine.turn({
        width: width,
        height: height,
        display: display,
        autoCenter: true,
        gradients: true,
        acceleration: true,
        direction: 'rtl', // 右開きに変更
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

            // 最終ページの場合、ボタンを追加
            if (i === pdf.numPages) {
                $pageElement.css('position', 'relative'); // ボタン配置の基準にする

                const $buttonContainer = $('<div>').addClass('button-container');
                
                // ▼ ボタンのテキストとリンク先を編集 ▼
                const $button1 = $('<button>').addClass('final-button').text('ボタン1').on('click', (e) => {window.open('https://www.amazon.co.jp', '_blank');}); // ボタン1のリンク先
                const $button2 = $('<button>').addClass('final-button').text('ボタン2').on('click', (e) => {window.open('https://tk-0120.github.io/namaiki/survey.html', '_blank'); }); // ボタン2のリンク先
                const $button3 = $('<button>').addClass('final-button').text('ボタン3').on('click', (e) => {window.open('https://tk-0120.github.io/namaiki/survey.html', '_blank'); }); // ボタン3のリンク先
                // ▲ ボタンのテキストとリンク先を編集 ▲

                $buttonContainer.append($button1, $button2, $button3);
                $pageElement.append($buttonContainer);
            }

            $magazine.append($pageElement);
        }

        $loader.addClass('hidden');
        $title.removeClass('hidden');
        $container.removeClass('hidden');
        $pageNumbers.removeClass('hidden');

        setupTurnJs();

    } catch (err) {
        $loader.addClass('hidden');
        $title.removeClass('hidden');
        let errorMessage = '不明なエラーが発生しました。';
        if (err && err.name === 'PasswordException') {
            errorMessage = 'パスワードが間違っています。再度入力してください。';
            sessionStorage.removeItem('pdfPassword'); // 保存されたパスワードをクリア
        } else if (err && err.message) {
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
    if (e.key === 'ArrowLeft') $magazine.turn('next');
    if (e.key === 'ArrowRight') $magazine.turn('previous');
});

$('#prev-button').on('click', () => $magazine.turn('next'));
$('#next-button').on('click', () => $magazine.turn('previous'));

// --- Initialization ---
let password = sessionStorage.getItem('pdfPassword');

if (!password) {
    password = prompt('PDFのパスワードを入力してください:');
    if (password) {
        sessionStorage.setItem('pdfPassword', password);
    }
}

if (password) {
    initializeViewer(password);
} else {
    $title.removeClass('hidden');
}
