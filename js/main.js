// js/main.js

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ========== 深色模式 ==========
function injectThemeToggle() {
  const nav = document.querySelector('.nav');
  if (!nav || document.getElementById('theme-toggle')) return;
  const btn = document.createElement('a');
  btn.href = '#';
  btn.id = 'theme-toggle';
  btn.className = 'theme-toggle';
  btn.textContent = '🌙';
  btn.addEventListener('click', e => {
    e.preventDefault();
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    btn.textContent = isDark ? '☀️' : '🌙';
  });
  nav.appendChild(btn);
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
    btn.textContent = '☀️';
  }
}

// ========== 阅读状态（存本地） ==========
function getBookStatus(bookId) {
  return localStorage.getItem('status_' + bookId) || '想读';
}
function setBookStatus(bookId, status) {
  localStorage.setItem('status_' + bookId, status);
}

// ========== 创建书籍卡片 ==========
function createBookCard(book) {
  const card = document.createElement('a');
  card.className = 'book-card';
  card.href = `detail.html?id=${book.id}`;
  card.innerHTML = `
    <div class="book-cover" style="${book.coverImage
      ? `background-image:url('${book.coverImage}');background-size:cover;background-position:center;`
      : `background:${book.coverColor};`}">
      ${book.coverImage ? '' : (book.coverText || book.title)}
    </div>
    <div class="book-info">
      <h3 class="book-title">${book.title}</h3>
      <p class="book-author">${book.author || ''}</p>
      <p class="book-intro">${book.intro || ''}</p>
    </div>
  `;
  return card;
}

// ========== 首页：最新 3 本 ==========
function renderLatest() {
  const container = document.getElementById('latest-list');
  if (!container) return;
  const sorted = [...books].sort((a, b) => new Date(b.readDate || 0) - new Date(a.readDate || 0));
  sorted.slice(0, 3).forEach(b => container.appendChild(createBookCard(b)));
}

// ========== 首页：全部书籍 ==========
function renderHomeAll() {
  const container = document.getElementById('home-all-list');
  if (!container) return;
  books.slice(0, 6).forEach(b => container.appendChild(createBookCard(b)));
}

// ========== 首页：随机推荐 ==========
function initRandom() {
  const btn = document.getElementById('random-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (books.length === 0) return;
    const r = books[Math.floor(Math.random() * books.length)];
    location.href = `detail.html?id=${r.id}`;
  });
}

// ========== 列表页：状态 + 筛选 ==========
let listFilters = { search: '', tag: 'all', status: 'all', sort: 'time' };

function initFilterBar() {
  const filterBar = document.querySelector('.filter-bar');
  if (!filterBar) return;
  // 从数据里生成标签按钮
  const tags = [...new Set(books.map(b => b.tag).filter(Boolean))];
  filterBar.innerHTML = '<button class="filter-btn active" data-tag="all">全部</button>';
  tags.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.tag = t;
    btn.textContent = t;
    filterBar.appendChild(btn);
  });

  filterBar.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      listFilters.tag = btn.dataset.tag;
      renderBookList();
    });
  });
}

function initStatusBar() {
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      listFilters.status = btn.dataset.status;
      renderBookList();
    });
  });
}

function initToolbar() {
  const search = document.getElementById('search-box');
  const sort = document.getElementById('sort-select');
  if (search) {
    search.addEventListener('input', () => {
      listFilters.search = search.value.trim();
      renderBookList();
    });
  }
  if (sort) {
    sort.addEventListener('change', () => {
      listFilters.sort = sort.value;
      renderBookList();
    });
  }
}

async function renderBookList() {
  const container = document.getElementById('book-list');
  if (!container) return;

  // 加载点赞和评论数
  const likeCounts = {};
  const commentCounts = {};
  try {
    const [likes, comments] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/likes?select=book_id`, { headers: HEADERS }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/comments?select=book_id`, { headers: HEADERS }).then(r => r.json())
    ]);
    likes.forEach(l => { likeCounts[l.book_id] = (likeCounts[l.book_id] || 0) + 1; });
    comments.forEach(c => { commentCounts[c.book_id] = (commentCounts[c.book_id] || 0) + 1; });
  } catch (e) { console.error(e); }

  // 过滤
  let list = [...books];
  if (listFilters.search) {
    const q = listFilters.search.toLowerCase();
    list = list.filter(b =>
      (b.title || '').toLowerCase().includes(q) ||
      (b.author || '').toLowerCase().includes(q)
    );
  }
  if (listFilters.tag !== 'all') list = list.filter(b => b.tag === listFilters.tag);
  if (listFilters.status !== 'all') list = list.filter(b => getBookStatus(b.id) === listFilters.status);

  // 排序
  if (listFilters.sort === 'time') {
    list.sort((a, b) => new Date(b.readDate || 0) - new Date(a.readDate || 0));
  } else if (listFilters.sort === 'likes') {
    list.sort((a, b) => (likeCounts[b.id] || 0) - (likeCounts[a.id] || 0));
  } else if (listFilters.sort === 'comments') {
    list.sort((a, b) => (commentCounts[b.id] || 0) - (commentCounts[a.id] || 0));
  }

  // 渲染
  container.innerHTML = '';
  if (list.length === 0) {
    container.innerHTML = '<p class="empty-state">没有找到符合条件的书。</p>';
    return;
  }
  list.forEach(b => container.appendChild(createBookCard(b)));
}

// ========== 首页统计 ==========
async function loadStats() {
  const [b, c, l] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/books?select=id`, { headers: HEADERS }).then(r => r.json()),
    fetch(`${SUPABASE_URL}/rest/v1/comments?select=id`, { headers: HEADERS }).then(r => r.json()),
    fetch(`${SUPABASE_URL}/rest/v1/likes?select=id`, { headers: HEADERS }).then(r => r.json())
  ]);
  document.getElementById('stat-books').textContent = b.length;
  document.getElementById('stat-comments').textContent = c.length;
  document.getElementById('stat-likes').textContent = l.length;
}

// ========== 详情页 ==========
async function renderDetail() {
  const container = document.getElementById('detail-content');
  if (!container) return;

  const id = getQueryParam('id');
  const book = books.find(b => b.id == id);
  if (!book) {
    container.innerHTML = `<p class="empty-state">没有找到这本书。</p><p><a href="books.html" style="color:var(--primary);">← 返回书籍列表</a></p>`;
    return;
  }

  const visitorId = getVisitorId();
  const [likeCount, liked, comments] = await Promise.all([
    loadLikeCount(book.id),
    hasLiked(book.id, visitorId),
    loadComments(book.id)
  ]);

  const status = getBookStatus(book.id);
  const doubanUrl = `https://search.douban.com/book/subject_search?search_text=${encodeURIComponent((book.title || '').replace(/[《》]/g, ''))}`;

  container.innerHTML = `
    <div class="detail-header">
      <div class="detail-cover" style="${book.coverImage
        ? `background-image:url('${book.coverImage}');background-size:cover;background-position:center;`
        : `background:${book.coverColor};`}">
        ${book.coverImage ? '' : (book.coverText || book.title)}
      </div>
      <div style="flex:1;">
        <h1>${book.title}</h1>
        <p class="detail-meta">作者：${book.author || '未知'} · 阅读时间：${book.readDate || '未填'}</p>
        <button id="like-btn" class="like-btn ${liked ? 'liked' : ''}">
          👍 <span id="like-count">${likeCount}</span>
        </button>

        <div class="status-selector" data-book="${book.id}">
          <button class="status-opt ${status === '想读' ? 'active' : ''}" data-status="想读">想读</button>
          <button class="status-opt ${status === '在读' ? 'active' : ''}" data-status="在读">在读</button>
          <button class="status-opt ${status === '已读' ? 'active' : ''}" data-status="已读">已读</button>
        </div>

        <div class="detail-actions">
          <button id="share-btn" class="action-btn">🔗 复制链接</button>
          <a href="${doubanUrl}" target="_blank" rel="noopener" class="action-btn">📚 去豆瓣看</a>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h2>读后感</h2>
      ${book.notes.map(p => `<p>${p}</p>`).join('')}
    </div>

    <div class="detail-section">
      <h2>摘抄笔记</h2>
      ${book.quotes.map(q => `<blockquote>${q}</blockquote>`).join('')}
    </div>

    <div class="detail-section">
      <h2>评论 (${comments.length})</h2>
      <form id="comment-form" class="comment-form">
        <input type="text" id="c-nickname" placeholder="你的昵称（可选）" maxlength="20">
        <textarea id="c-content" placeholder="写点什么…" required maxlength="300"></textarea>
        <button type="submit">发表评论</button>
      </form>
      <div id="comment-list" class="comment-list">
        ${comments.map(c => `
          <div class="comment-item" data-comment-id="${c.id}">
            <div class="comment-head">
              <strong>${c.nickname}</strong>
              <span>${new Date(c.created_at).toLocaleString('zh-CN')}</span>
            </div>
            <p>${c.content}</p>
            <button class="comment-delete" data-comment-id="${c.id}">删除</button>
          </div>
        `).join('')}
      </div>
    </div>

    <p style="margin-top:24px;">
      <button id="delete-btn" class="delete-btn">删除这本书</button>
    </p>

    <p class="back-link"><a href="books.html">← 返回书籍列表</a></p>
  `;

  // 点赞
  document.getElementById('like-btn').addEventListener('click', async () => {
    const btn = document.getElementById('like-btn');
    const isLiked = btn.classList.contains('liked');
    if (isLiked) {
      await removeLike(book.id, visitorId);
      btn.classList.remove('liked');
    } else {
      await addLike(book.id, visitorId);
      btn.classList.add('liked');
    }
    const newCount = await loadLikeCount(book.id);
    document.getElementById('like-count').textContent = newCount;
  });

  // 阅读状态
  document.querySelectorAll('.status-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.status-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setBookStatus(book.id, btn.dataset.status);
    });
  });

  // 复制链接
  document.getElementById('share-btn').addEventListener('click', async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert('链接已复制，可以分享给朋友了！');
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      alert('链接已复制！');
    }
  });

  // 评论提交
  document.getElementById('comment-form').addEventListener('submit', async e => {
    e.preventDefault();
    const nickname = document.getElementById('c-nickname').value.trim();
    const content = document.getElementById('c-content').value.trim();
    if (!content) return;
    const ok = await postComment(book.id, nickname, content);
    if (ok) location.reload();
    else alert('评论失败，请稍后再试');
  });

  // 评论删除
  document.querySelectorAll('.comment-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pwd = prompt('请输入管理员密码：');
      if (pwd !== 'admin123') { alert('密码错误。'); return; }
      if (!confirm('确定删除这条评论吗？')) return;
      const cid = btn.dataset.commentId;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/comments?id=eq.${cid}`, {
        method: 'DELETE', headers: HEADERS
      });
      if (res.ok) { btn.closest('.comment-item').remove(); }
      else { alert('删除失败，请稍后再试。'); }
    });
  });

  // 删除书籍
  const deleteBtn = document.getElementById('delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const pwd = prompt('请输入管理员密码：');
      if (pwd !== 'admin123') { alert('密码错误。'); return; }
      if (!confirm('确定要删除这本书吗？相关评论和点赞也会一起删除。')) return;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/books?id=eq.${book.id}`, {
        method: 'DELETE', headers: HEADERS
      });
      if (res.ok) { alert('删除成功！'); location.href = 'books.html'; }
      else { alert('删除失败，请稍后再试。'); }
    });
  }
}

// ========== 总指挥 ==========
document.addEventListener('DOMContentLoaded', async () => {
  injectThemeToggle();
  await loadBooks();
  renderLatest();
  if (document.getElementById('stat-books')) loadStats();
  if (document.getElementById('home-all-list')) renderHomeAll();
  if (document.getElementById('random-btn')) initRandom();
  if (document.getElementById('book-list')) {
    initFilterBar();
    initStatusBar();
    initToolbar();
    renderBookList();
  }
  renderDetail();
});