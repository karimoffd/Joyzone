import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getApiErrorMessage } from '../../api/client.js';

const FALLBACK_REVIEWS = [
  { id: 'fallback-1', user_name: 'Amir Karimov', place_title: 'Focus Hub Coworking', rating: 5, comment: 'Отличное место, всё чисто и удобно. HDMI кабели были заранее подготовлены. Обязательно вернёмся!', created_at: '14 авг', replied: false, color: '#294a6d' },
  { id: 'fallback-2', user_name: 'Dilnoza Yusupova', place_title: 'Atlas Meeting Room', rating: 4, comment: 'Хорошая переговорная, только кондиционер немного шумит. В целом всё хорошо.', created_at: '12 авг', replied: true, color: '#1a6b6b' },
  { id: 'fallback-3', user_name: 'Bekzod Tursunov', place_title: 'Navoiy Event Space', rating: 5, comment: 'Провели мероприятие на 100 человек, всё прошло отлично! Персонал очень помог с организацией.', created_at: '10 авг', replied: false, color: '#e46630' },
  { id: 'fallback-4', user_name: 'Gulnora Rashidova', place_title: 'Quiet Work Studio', rating: 3, comment: 'Неплохо, но стул неудобный. Хотелось бы больше розеток на рабочих местах.', created_at: '9 авг', replied: false, color: '#4a3070' },
];

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function normalizeReview(review, index = 0) {
  const userName = review.user_name || review.name || review.user?.username || 'Пользователь';
  const placeTitle = review.place_title || review.place?.title || review.place || 'Место';
  return {
    ...review,
    id: review.id || `review-${index}`,
    user_name: userName,
    place_title: placeTitle,
    rating: Number(review.rating ?? review.stars ?? 0),
    comment: review.comment || review.text || '',
    created_at: formatDate(review.created_at || review.date),
    color: review.color || ['#294a6d', '#1a6b6b', '#e46630', '#4a3070'][index % 4],
  };
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/reviews/');
      const data = response.data?.results || response.data || [];
      setReviews(Array.isArray(data) ? data.map(normalizeReview) : []);
      setUsingFallback(false);
      return true;
    } catch (requestError) {
      const fallback = import.meta.env.DEV ? FALLBACK_REVIEWS.map(normalizeReview) : [];
      setReviews(fallback);
      setUsingFallback(import.meta.env.DEV && fallback.length > 0);
      setError(`${getApiErrorMessage(requestError, 'Не удалось загрузить отзывы.')} ${import.meta.env.DEV ? 'Показаны только DEV fallback данные.' : ''}`.trim());
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews().catch(() => {});
  }, [loadReviews]);

  const avg = useMemo(() => {
    if (reviews.length === 0) return '0.0';
    return (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1);
  }, [reviews]);

  const handleDelete = async (review) => {
    if (!review?.id) return;

    if (usingFallback || String(review.id).startsWith('fallback-')) {
      setActionError('DEV fallback отзыв не существует в backend и не может быть удалён.');
      return;
    }

    try {
      setDeletingId(review.id);
      setActionError('');
      setActionSuccess('');
      await api.delete(`/api/reviews/${review.id}/`);
      const refreshed = await loadReviews();
      if (refreshed) {
        setActionSuccess('Отзыв удалён. Список и рейтинг обновлены из backend.');
      } else {
        setActionError('Отзыв удалён, но обновить список не удалось. Повторите загрузку.');
      }
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Не удалось удалить отзыв. Проверьте права администратора.'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="adm-anim adm-anim-1">
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, marginBottom: 24 }}>
        <div className="adm-card adm-card-pad" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: 'var(--navy)', letterSpacing: -2 }}>{avg}</div>
          <div style={{ color: '#f59e0b', fontSize: 24, marginBottom: 4 }}>{'★'.repeat(Math.round(Number(avg)))}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Средний рейтинг</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{reviews.length} отзывов</div>
          {loading ? <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Загрузка...</div> : null}
          {usingFallback ? <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 800, marginTop: 8 }}>DEV fallback</div> : null}
          {error ? <div style={{ fontSize: 11, color: '#dc2626', marginTop: 8 }}>{error}</div> : null}
        </div>
        <div className="adm-card adm-card-pad">
          {[5,4,3,2,1].map(s => {
            const count = reviews.filter(r => Number(r.rating) === s).length;
            const pct = reviews.length ? (count / reviews.length) * 100 : 0;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 16, color: 'var(--text-muted)' }}>{s}</span>
                <span style={{ color: '#f59e0b', fontSize: 13 }}>★</span>
                <div style={{ flex: 1, height: 8, background: 'var(--cream)', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: 'var(--orange)', borderRadius: 4 }} /></div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 16 }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {actionError ? <div className="adm-card adm-card-pad" role="alert" style={{ color: '#b91c1c', fontWeight: 700 }}>{actionError}</div> : null}
        {actionSuccess ? <div className="adm-card adm-card-pad" role="status" style={{ color: '#15803d', fontWeight: 700 }}>{actionSuccess}</div> : null}
        {error && !usingFallback ? (
          <div className="adm-card adm-card-pad" role="alert" style={{ color: '#b91c1c' }}>
            <div>{error}</div>
            <button type="button" className="adm-btn adm-btn-outline" onClick={loadReviews} style={{ marginTop: 10 }}>Повторить</button>
          </div>
        ) : null}
        {reviews.map((r, i) => (
          <div key={r.id || i} className="adm-card adm-card-pad">
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0, overflow: 'hidden' }}>
                {r.user_avatar ? <img src={r.user_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : r.user_name.slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <div><strong style={{ fontSize: 14 }}>{r.user_name}</strong> <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{r.place_title}</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#f59e0b', fontSize: 14 }}>{'★'.repeat(Math.round(Number(r.rating || 0)))}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.created_at}</span>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>{r.comment}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="adm-btn adm-btn-outline"
                    style={{ fontSize: 12, padding: '6px 14px', color: '#dc2626' }}
                    disabled={deletingId === r.id || usingFallback}
                    onClick={() => handleDelete(r)}
                    title={usingFallback ? 'Недоступно для DEV fallback данных' : 'Удалить отзыв из backend'}
                  >
                    {deletingId === r.id ? 'Удаление...' : 'Удалить'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!loading && reviews.length === 0 ? (
          <div className="adm-card adm-card-pad" style={{ color: 'var(--text-muted)' }}>Отзывов пока нет.</div>
        ) : null}
      </div>
    </div>
  );
}
