// js/data.js

const SUPABASE_URL = 'https://luszkxadsomitgribdjg.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable__RmVJxYQKrgAUcTwQoZbwQ_-wVywUW7';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,   // 必须用反引号
  'Content-Type': 'application/json'
};

let books = [];

// 读取所有书籍
async function loadBooks() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/books?select=*&order=created_at.desc`,
    { headers: HEADERS }
  );
  if (!res.ok) {
    console.error('加载书籍失败', res.status, res.statusText);
    return;
  }
  const data = await res.json();
  books = data.map(b => ({
    id: b.id,
    title: b.title,
    author: b.author,
    readDate: b.read_date,
    intro: b.intro,
    coverColor: b.cover_color,
    coverText: b.cover_text,
    coverImage: b.cover_image,
    notes: b.notes || [],
    quotes: b.quotes || []
  }));
}

// 读取某本书的评论
async function loadComments(bookId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/comments?book_id=eq.${bookId}&order=created_at.desc`,
    { headers: HEADERS }
  );
  return res.ok ? await res.json() : [];
}

// 发表评论
async function postComment(bookId, nickname, content) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      book_id: bookId,
      nickname: nickname || '匿名',
      content: content
    })
  });
  return res.ok;
}

// 读取点赞数
async function loadLikeCount(bookId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/likes?book_id=eq.${bookId}&select=id`,
    { headers: HEADERS }
  );
  const data = res.ok ? await res.json() : [];
  return data.length;
}

// 判断当前访客是否点过赞
async function hasLiked(bookId, visitorId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/likes?book_id=eq.${bookId}&visitor_id=eq.${visitorId}&select=id`,
    { headers: HEADERS }
  );
  const data = res.ok ? await res.json() : [];
  return data.length > 0;
}

// 点赞
async function addLike(bookId, visitorId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/likes`, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ book_id: bookId, visitor_id: visitorId })
  });
  return res.ok;
}

// 取消点赞
async function removeLike(bookId, visitorId) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/likes?book_id=eq.${bookId}&visitor_id=eq.${visitorId}`,
    { method: 'DELETE', headers: HEADERS }
  );
}

// 给每台设备生成唯一 ID
function getVisitorId() {
  let id = localStorage.getItem('visitor_id');
  if (!id) {
    id = 'v_' + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem('visitor_id', id);
  }
  return id;
}