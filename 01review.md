# DropNKeep Phase 1 デバッグレポート

## 🔍 主要な問題点

### 1. **manifest.json の web_accessible_resources が未定義**
**重大度: 高**

CSSファイル (`overlay.css`) を content script から読み込んでいますが、manifest.json に `web_accessible_resources` の宣言がありません。

```json
// manifest.json に追加が必要
"web_accessible_resources": [
  {
    "resources": ["assets/styles/overlay.css"],
    "matches": ["https://keep.google.com/*"]
  }
]
```

### 2. **ファイルパス不一致**
**重大度: 高**

- `drop-handler.js` で `chrome.runtime.getURL('assets/styles/overlay.css')` を呼び出し
- 実際のファイルは `assets_styles_overlay.css` (アンダースコア区切り)
- ファイル構造を統一する必要があります

**推奨修正:**
```
assets/
├── styles/
│   └── overlay.css
└── icons/
    ├── icon48.png
    └── icon128.png
```

### 3. **Keep DOM セレクタの脆弱性**
**重大度: 中**

`keep-client.js` のセレクタが複数のフォールバックを持っていますが、現在のGoogle Keepの構造と一致しない可能性があります。

**改善提案:**
```javascript
// より堅牢なセレクタ戦略
const SELECTORS = {
  takeNote: [
    '[aria-label*="Take a note"]',
    '[data-se="create-note-button"]',
    'textarea[placeholder*="Take a note"]'
  ],
  composer: [
    '[role="dialog"]',
    '.RnEEge', // Keep特有のクラス（要確認）
    '#dialog'
  ],
  titleBox: [
    'div[contenteditable="true"][aria-label*="Title"]',
    'input[aria-label*="Title"]'
  ],
  bodyBox: [
    'div[contenteditable="true"][aria-label*="note"]',
    'div[contenteditable="true"]:not([aria-label*="Title"])'
  ]
};
```

### 4. **エラーハンドリングの不足**
**重大度: 中**

- `drop-handler.js` で基本的なエラーハンドリングはあるが、詳細なログが不足
- ユーザーへのフィードバックが不十分

**改善案:**
```javascript
// より詳細なエラーメッセージ
catch (err) {
  console.error('DropNKeep Error:', {
    type: err.name,
    message: err.message,
    stack: err.stack,
    file: file.name,
    size: file.size
  });
  
  const userMessage = err.name === 'NotFoundError' 
    ? 'Google Keepのノート作成ボタンが見つかりません。ページを再読み込みしてください。'
    : `エラーが発生しました: ${err.message}`;
  
  toast(userMessage, 4000);
}
```

### 5. **文字エンコーディング検出の限界**
**重大度: 低**

TextDecoder の fallback 戦略は基本的ですが、Shift_JIS がブラウザでサポートされていない可能性があります。

**改善提案:**
```javascript
// encoding.js ライブラリの利用を検討
// または jschardet などの専用ライブラリ
import jschardet from 'jschardet';

function detectEncoding(buffer) {
  const detection = jschardet.detect(new Uint8Array(buffer));
  return detection.encoding || 'utf-8';
}
```

### 6. **競合状態の可能性**
**重大度: 中**

`keep-client.js` の `createNote()` で固定待機時間 (800ms) を使用していますが、ネットワーク状況によっては不十分な場合があります。

**改善案:**
```javascript
// MutationObserver を使った確実な検知
async function waitForNoteCreation() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(new Error('Note creation timeout'));
    }, 5000);
    
    const observer = new MutationObserver((mutations) => {
      // Keep のノートリストの変更を監視
      const noteCreated = document.querySelector('.IZ65Hb-n0tgWb'); // 要確認
      if (noteCreated) {
        clearTimeout(timeout);
        observer.disconnect();
        resolve();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}
```

### 7. **lib/text-encoder.js が未使用**
**重大度: 低**

- ES6 module として export しているが、どこからも import されていない
- `drop-handler.js` に同様の機能が重複実装されている

**推奨:** 統合または削除

---

## ✅ 修正済みの良い点

1. **ドラッグカウンターの実装**: dragleave イベントのバブリング問題に対応
2. **ファイルサイズ制限**: 10MB 制限で適切
3. **設定の永続化**: chrome.storage.local の活用
4. **Toast 通知**: 既存要素のクリーンアップ処理

---

## 🔧 推奨修正優先順位

### Priority 1 (即座に修正)
- [ ] manifest.json に `web_accessible_resources` 追加
- [ ] ファイルパス統一 (アンダースコア → スラッシュ)
- [ ] アイコンファイルの作成/配置確認

### Priority 2 (動作改善)
- [ ] Keep DOM セレクタの実地テスト & 調整
- [ ] エラーメッセージの詳細化
- [ ] MutationObserver によるノート作成検知

### Priority 3 (機能強化)
- [ ] より高度な文字エンコーディング検出
- [ ] 複数ファイル対応の準備
- [ ] ユニットテストの追加

---

## 🧪 テスト手順

```bash
# 1. ファイル構造修正
mkdir -p assets/styles assets/icons
mv assets_styles_overlay.css assets/styles/overlay.css

# 2. アイコン作成 (48x48, 128x128 PNG)
# プレースホルダーでも可

# 3. manifest.json 更新

# 4. Chrome で読み込み
# chrome://extensions → Developer mode ON → Load unpacked

# 5. Google Keep でテスト
# https://keep.google.com
# - .txt ファイルをドラッグ
# - コンソールでエラー確認
# - ノート作成確認
```

---

## 📋 修正済み manifest.json

```json
{
  "manifest_version": 3,
  "name": "DropNKeep",
  "version": "0.1.0",
  "description": "Drag & drop .txt files to create Google Keep notes (Phase 1)",
  "permissions": ["activeTab", "storage", "scripting"],
  "host_permissions": ["https://keep.google.com/*"],
  "background": { "service_worker": "background.js" },
  "content_scripts": [
    {
      "matches": ["https://keep.google.com/*"],
      "js": [
        "content/keep-client.js",
        "content/drop-handler.js",
        "content/content.js"
      ],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["assets/styles/overlay.css"],
      "matches": ["https://keep.google.com/*"]
    }
  ],
  "icons": {
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
```

---

## 💡 今後の改善提案

1. **デバッグモード追加**: 開発時に詳細ログを有効化
2. **オプションページ実装**: 設定UIの追加 (Phase 2)
3. **E2Eテスト**: Puppeteer によるテスト自動化
4. **国際化対応**: chrome.i18n API の活用

---

## 📌 注意事項

- Google Keep の DOM 構造は予告なく変更される可能性があります
- 定期的なメンテナンスが必要です
- Chrome Web Store 公開前に Google Keep の利用規約を確認してください
