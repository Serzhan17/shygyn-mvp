import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, ChartNoAxesCombined, Wallet, Landmark,
  Settings2, LogOut, Plus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  ChevronRight, ChevronLeft, ReceiptText, X, CalendarDays, Check, Trash2, Pencil,
  CreditCard, Banknote, CircleDollarSign, ShieldCheck, Eye, EyeOff, Sparkles,
  Search, Download, Utensils, Car, ShoppingBag, Repeat2, House, HeartPulse,
  Clapperboard, GraduationCap, BriefcaseBusiness, Coins, SlidersHorizontal, AlertCircle,
  Menu, Info, PiggyBank, ArrowRight, LoaderCircle
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { api, post, patch, remove, setToken, getToken } from './api.js';

const categories = [
  { value: 'food', label: 'Еда', icon: Utensils, color: '#29C397' },
  { value: 'transport', label: 'Транспорт', icon: Car, color: '#78D8B8' },
  { value: 'shopping', label: 'Покупки', icon: ShoppingBag, color: '#87A4FF' },
  { value: 'subscriptions', label: 'Подписки', icon: Repeat2, color: '#F8BB7F' },
  { value: 'home', label: 'Дом', icon: House, color: '#A68DF2' },
  { value: 'health', label: 'Здоровье', icon: HeartPulse, color: '#F78D86' },
  { value: 'entertainment', label: 'Развлечения', icon: Clapperboard, color: '#F1C96D' },
  { value: 'education', label: 'Образование', icon: GraduationCap, color: '#7CCDEB' },
  { value: 'salary', label: 'Зарплата', icon: Coins, color: '#45D6A4' },
  { value: 'business', label: 'Бизнес', icon: BriefcaseBusiness, color: '#72A9F5' },
  { value: 'other', label: 'Другое', icon: CircleDollarSign, color: '#A9BCB2' },
];
const categoryMap = Object.fromEntries(categories.map(c => [c.value, c]));
const NAV = [
  { id: 'dashboard', label: 'Обзор', icon: LayoutDashboard },
  { id: 'transactions', label: 'Операции', icon: ArrowLeftRight },
  { id: 'analytics', label: 'Аналитика', icon: ChartNoAxesCombined },
  { id: 'accounts', label: 'Мои счета', icon: Wallet },
  { id: 'loans', label: 'Кредиты', icon: Landmark },
];
const money = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(value || 0)) + ' ₸';
const currency = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number(value || 0)) + ' ₸';
const shortMoney = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0, notation: 'compact' }).format(Number(value || 0));
const monthLabel = value => new Date(`${value}-01T12:00:00`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
const dayLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
const currentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function Logo({ big = false }) {
  return <div className={`brand ${big ? 'brand--big' : ''}`}><span className="brand-mark">₸</span><span>Shygyn</span></div>;
}
function Button({ children, variant = 'primary', icon: Icon, className = '', ...props }) {
  return <button className={`btn btn--${variant} ${className}`} {...props}>{Icon && <Icon size={17} />}{children}</button>;
}
function SectionHead({ eyebrow, title, action }) {
  return <div className="section-head"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{action}</div>;
}
function Empty({ icon: Icon = ReceiptText, title, description, action }) {
  return <div className="empty"><div className="empty__icon"><Icon size={29} /></div><h3>{title}</h3><p>{description}</p>{action}</div>;
}
function TagIcon({ category, income = false }) {
  const cfg = categoryMap[category] || categoryMap.other;
  const Icon = cfg.icon;
  return <div className="category-icon" style={{ '--icon-color': income ? '#29C397' : cfg.color }}><Icon size={19} strokeWidth={1.9} /></div>;
}
function Notification({ text, dismiss }) {
  if (!text) return null;
  return <div role="alert" className="toast"><AlertCircle size={17} /> <span>{text}</span><button aria-label="Закрыть" onClick={dismiss}><X size={17} /></button></div>;
}
function Dialog({ title, children, onClose, width = 'small' }) {
  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={title} className={`modal modal--${width}`}>
      <div className="modal-heading"><h2>{title}</h2><button className="icon-btn" aria-label="Закрыть" onClick={onClose}><X size={21}/></button></div>
      {children}
    </div>
  </div>;
}

function Auth({ onAuthed }) {
  const [register, setRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ first_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const result = await post(register ? '/auth/register/' : '/auth/login/', register ? form : { email: form.email, password: form.password });
      setToken(result.token); onAuthed(result.user);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  return <main className="auth-page">
    <div className="auth-decoration auth-decoration--one"/><div className="auth-decoration auth-decoration--two"/>
    <div className="auth-layout">
      <section className="auth-story"><Logo big /><span className="eyebrow">ВАШИ ФИНАНСЫ ПОД КОНТРОЛЕМ</span><h1>Деньги должны работать <em>на вас.</em></h1><p>Видьте расходы, управляйте бюджетом и сравнивайте кредитные сценарии — в одном удобном месте.</p>
        <div className="auth-preview"><div className="auth-preview__top"><span>Осталось в бюджете</span><span className="live-pill"><span /> личный обзор</span></div><strong>112 400 ₸</strong><div className="auth-preview__bars"><span style={{width: '73%'}}/><span style={{width: '48%'}}/><span style={{width: '28%'}}/></div><small>Ваш финансовый обзор — на одном экране</small></div>
        <div className="auth-footer"><ShieldCheck size={18}/> Счета и операции доступны только вам</div>
      </section>
      <section className="auth-card"><div className="auth-card__eyebrow">SHYGYN / ЛИЧНЫЙ КАБИНЕТ</div><h2>{register ? 'Создать аккаунт' : 'С возвращением!'}</h2><p>{register ? 'Начните управлять деньгами осознаннее.' : 'Войдите, чтобы увидеть свою финансовую картину.'}</p>
        <form onSubmit={submit} className="form-stack">
          {register && <label>Ваше имя<input type="text" value={form.first_name} maxLength={150} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="Как вас зовут" /></label>}
          <label>Email<input type="email" required autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="example@mail.kz" /></label>
          <label>Пароль<div className="password-field"><input required autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={register ? 'Не менее 8 символов' : 'Введите пароль'} /><button type="button" aria-label="Показать пароль" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
          {error && <div className="inline-error" role="alert">{error}</div>}
          <Button type="submit" disabled={loading} className="btn--wide">{loading ? 'Подождите…' : register ? 'Зарегистрироваться' : 'Войти'} <ArrowRight size={17}/></Button>
        </form>
        <div className="auth-switch">{register ? 'Уже есть аккаунт?' : 'Ещё нет аккаунта?'} <button onClick={() => { setRegister(!register); setError(''); }}>{register ? 'Войти' : 'Создать аккаунт'}</button></div>
        <p className="auth-warning">MVP для локального тестирования. Не вводите реальные банковские реквизиты или секретные данные.</p>
      </section>
    </div>
  </main>;
}

function TransactionForm({ accounts, initial, onClose, onSave }) {
  const [form, setForm] = useState({
    account: initial?.account ?? accounts[0]?.id ?? '',
    transaction_type: initial?.transaction_type || 'expense',
    category: initial?.category || 'food',
    amount: initial?.amount || '', description: initial?.description || '',
    occurred_at: initial?.occurred_at || today(),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const payload = { ...form, account: Number(form.account), amount: String(form.amount) };
      if (initial) await patch(`/transactions/${initial.id}/`, payload);
      else await post('/transactions/', payload);
      onSave();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Dialog title={initial ? 'Изменить операцию' : 'Новая операция'} onClose={onClose}>
    <form className="form-stack" onSubmit={submit}>
      <div className="type-switch"><button type="button" className={form.transaction_type === 'expense' ? 'active' : ''} onClick={() => setForm({...form, transaction_type:'expense', category:'food'})}>− Расход</button><button type="button" className={form.transaction_type === 'income' ? 'active' : ''} onClick={() => setForm({...form, transaction_type:'income', category:'salary'})}>+ Доход</button></div>
      <label>Сумма, ₸<input type="number" min="0.01" max="999999999999" step="0.01" placeholder="0" required value={form.amount} onChange={e => setForm({ ...form, amount:e.target.value })}/></label>
      <label>Описание<input type="text" maxLength="160" placeholder="Например, продукты в магазине" required value={form.description} onChange={e => setForm({ ...form, description:e.target.value })}/></label>
      <div className="form-grid"><label>Категория<select value={form.category} onChange={e => setForm({...form, category:e.target.value})}>{categories.filter(c => form.transaction_type === 'income' ? ['salary','business','other'].includes(c.value) : !['salary','business'].includes(c.value)).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label><label>Дата<input type="date" required value={form.occurred_at} onChange={e => setForm({...form, occurred_at:e.target.value})}/></label></div>
      <label>Счёт<select value={form.account} onChange={e => setForm({...form, account:e.target.value})} required>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.bank ? ` · ${a.bank}` : ''}</option>)}</select></label>
      {error && <div className="inline-error">{error}</div>}
      <Button disabled={busy || !accounts.length} className="btn--wide" type="submit">{busy ? 'Сохранение…' : initial ? 'Сохранить изменения' : 'Добавить операцию'}</Button>
    </form>
  </Dialog>;
}
function AccountForm({ initial, onClose, onSave }) {
  const [form, setForm] = useState({name:initial?.name||'',bank:initial?.bank||'',account_type:initial?.account_type||'card', opening_balance:initial?.opening_balance||'0'});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { if(initial) await patch(`/accounts/${initial.id}/`, form); else await post('/accounts/', form); onSave(); }
    catch(err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Dialog title={initial ? 'Изменить счёт' : 'Добавить счёт'} onClose={onClose}>
    <form className="form-stack" onSubmit={submit}>
      <label>Название<input required placeholder="Например, Основная карта" maxLength="80" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label>Тип счёта<select value={form.account_type} onChange={e=>setForm({...form,account_type:e.target.value})}><option value="card">Банковская карта</option><option value="cash">Наличные</option></select></label>
      <label>Банк (необязательно)<input placeholder="Например, название банка" maxLength="80" value={form.bank} onChange={e=>setForm({...form,bank:e.target.value})}/></label>
      <label>Начальный остаток, ₸<input type="number" step="0.01" required value={form.opening_balance} onChange={e=>setForm({...form,opening_balance:e.target.value})}/></label>
      <p className="input-hint">Начальный остаток + доходы − расходы = текущий баланс счёта.</p>
      {error && <div className="inline-error">{error}</div>}
      <Button className="btn--wide" type="submit" disabled={busy}>{busy ? 'Сохранение…' : 'Сохранить счёт'}</Button>
    </form>
  </Dialog>;
}
function BudgetForm({ month, existing, onClose, onSave }) {
  const [limit, setLimit] = useState(existing?.limit || '240000');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e){ e.preventDefault();setBusy(true);setError('');try{await post('/budgets/',{month:`${month}-01`,limit});onSave();}catch(err){setError(err.message);}finally{setBusy(false);} }
  return <Dialog title="Бюджет месяца" onClose={onClose}><form className="form-stack" onSubmit={submit}><p className="modal-copy">Укажите, сколько вы планируете потратить за {monthLabel(month)}. Остаток рассчитывается по расходам, а не по балансу карты.</p><label>Лимит расходов, ₸<input autoFocus type="number" min="0.01" step="0.01" required value={limit} onChange={e=>setLimit(e.target.value)}/></label>{error && <div className="inline-error">{error}</div>}<Button className="btn--wide" type="submit" disabled={busy}>{busy?'Сохранение…':'Сохранить бюджет'}</Button></form></Dialog>;
}
function TransactionItems({ items, onEdit, onDelete, compact=false }) {
  return <div className="transaction-list">{items.map(t => <div className="transaction-row" key={t.id}><TagIcon category={t.category} income={t.transaction_type==='income'}/><div className="transaction-row__text"><strong>{t.description}</strong><span>{t.category_label} · {t.account_name} · {dayLabel(t.occurred_at)}</span></div><div className="transaction-row__right"><strong className={t.transaction_type === 'income' ? 'positive' : ''}>{t.transaction_type === 'income' ? '+' : '−'}{money(t.amount)}</strong>{!compact && <div className="row-actions"><button title="Изменить" aria-label="Изменить операцию" onClick={()=>onEdit(t)}><Pencil size={15}/></button><button title="Удалить" aria-label="Удалить операцию" onClick={()=>onDelete(t)}><Trash2 size={15}/></button></div>}</div></div>)}</div>;
}
function ProgressBar({ value, color='#2dca9d' }) {return <div className="progress-track"><div style={{width:`${Math.min(Math.max(Number(value)||0,0),100)}%`,backgroundColor:color}}/></div>;}
function SummaryCards({ summary }) {
  return <div className="metric-grid">
    <div className="metric-card"><div className="metric-head"><span>Доходы за месяц</span><div className="metric-icon metric-icon--green"><ArrowDownLeft size={19}/></div></div><strong className="metric-number">{money(summary?.income)}</strong><span className="metric-caption"><TrendingUp size={14}/> Все поступления</span></div>
    <div className="metric-card"><div className="metric-head"><span>Расходы за месяц</span><div className="metric-icon metric-icon--orange"><ArrowUpRight size={19}/></div></div><strong className="metric-number">{money(summary?.expenses)}</strong><span className="metric-caption">Все траты за выбранный месяц</span></div>
    <div className="metric-card"><div className="metric-head"><span>Баланс всех счетов</span><div className="metric-icon metric-icon--blue"><Wallet size={19}/></div></div><strong className="metric-number">{money(summary?.total_balance)}</strong><span className="metric-caption">По добавленным операциям</span></div>
  </div>;
}
function CategoryBreakdown({ categories: rows = [], total = 0, compact = false }) {
  if(!rows.length) return <Empty title="Пока нет расходов" description="Добавьте расходы — появится распределение по категориям." icon={ChartNoAxesCombined}/>;
  return <div className="category-breakdown">{rows.slice(0,compact?5:20).map(row => {const conf=categoryMap[row.category] || categoryMap.other;const share=Number(total)>0?Number(row.amount)/Number(total)*100:0;return <div className="category-breakdown__item" key={row.category}><div className="category-breakdown__line"><span><span className="category-dot" style={{background:conf.color}}/>{row.label}</span><span>{money(row.amount)} <small>{share.toFixed(0)}%</small></span></div><ProgressBar value={share} color={conf.color}/></div>;})}</div>;
}
function Dashboard({ summary, openTxn, openBudget, go, accounts }) {
  const rows=summary?.categories||[];
  const spent=Number(summary?.expenses||0);
  const lim=summary?.budget_limit != null ? Number(summary.budget_limit):null;
  const remain=summary?.remaining!=null ? Number(summary.remaining):null;
  const percentage=lim>0?spent/lim*100:0;
  const daily=summary?.daily||[];
  const trend = daily.length ? daily.map(d=>({date:dayLabel(d.date), expense:Number(d.expense),income:Number(d.income)})) : [];
  return <>
    <div className="welcome-row"><div><span className="eyebrow">ВАША ФИНАНСОВАЯ КАРТИНА</span><h1>Обзор финансов <span className="wave">✦</span></h1><p>Контролируйте расходы и принимайте решения увереннее.</p></div><Button icon={Plus} onClick={openTxn}>Добавить операцию</Button></div>
    <section className="balance-hero"><div className="hero-glow"/><div className="hero-title"><span>ОСТАЛОСЬ НА МЕСЯЦ</span><PiggyBank size={24}/></div><div className="hero-amount">{remain===null ? '— ₸' : money(remain)}</div><p>{remain===null?'Установите бюджет, чтобы увидеть доступный остаток.':remain>=0?'Ваш доступный бюджет на оставшуюся часть месяца':'Бюджет превышен — пересмотрите расходы'}</p><div className="hero-progress"><div className="hero-progress__labels"><span>Потрачено: {money(spent)}</span><span>{lim===null?'Лимит не задан':`Лимит: ${money(lim)}`}</span></div><ProgressBar value={percentage}/></div><button className="hero-link" onClick={openBudget}>{lim===null?'Установить месячный бюджет':'Изменить бюджет'} <ArrowRight size={16}/></button><div className="hero-pattern hero-pattern--one"/><div className="hero-pattern hero-pattern--two"/></section>
    <SummaryCards summary={summary}/>
    <div className="dashboard-columns">
      <section className="panel"><SectionHead eyebrow="СТАТИСТИКА" title="Динамика расходов" action={<button className="text-link" onClick={()=>go('analytics')}>Подробнее <ChevronRight size={15}/></button>}/>{trend.length?<div className="chart-box"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{top:10,right:10,bottom:0,left:-20}}><defs><linearGradient id="chartExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#30C99C" stopOpacity={0.28}/><stop offset="95%" stopColor="#30C99C" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="4 4" stroke="#2A3E34" vertical={false}/><XAxis dataKey="date" tick={{fill:'#87998F',fontSize:11}} tickLine={false} axisLine={false}/><YAxis tick={{fill:'#87998F',fontSize:11}} tickFormatter={shortMoney} tickLine={false} axisLine={false}/><Tooltip contentStyle={{background:'#192a22',color:'#fff',border:'1px solid #365045',borderRadius:12}} formatter={v=>money(v)}/><Area type="monotone" dataKey="expense" name="Расходы" stroke="#35CC9F" strokeWidth={3} fill="url(#chartExpense)"/></AreaChart></ResponsiveContainer></div>:<Empty title="Нет данных" description="График появится после добавления операций."/>}</section>
      <section className="panel"><SectionHead eyebrow="АНАЛИТИКА" title="Категории расходов" action={<button className="text-link" onClick={()=>go('analytics')}>Все категории <ChevronRight size={15}/></button>}/><CategoryBreakdown categories={rows} total={spent} compact/></section>
    </div>
    <section className="panel panel--last"><SectionHead eyebrow="ПОСЛЕДНИЕ ДЕЙСТВИЯ" title="Недавние операции" action={<button className="text-link" onClick={()=>go('transactions')}>Все операции <ChevronRight size={15}/></button>}/>{summary?.recent_transactions?.length?<TransactionItems items={summary.recent_transactions} compact/>:<Empty title="Операций пока нет" description={accounts.length?'Запишите первую покупку или доход.':'Для начала создайте счёт, затем добавьте операцию.'} action={<Button icon={Plus} onClick={accounts.length?openTxn:()=>go('accounts')}>{accounts.length?'Добавить операцию':'Создать счёт'}</Button>}/>}</section>
  </>;
}
function Transactions({ transactions, onAdd, onEdit, onDelete, accounts }) {
  const [search,setSearch]=useState('');const [kind,setKind]=useState('all');const [account,setAccount]=useState('all');
  const list=transactions.filter(t=>(kind==='all'||t.transaction_type===kind)&&(account==='all'||String(t.account)===account)&&`${t.description} ${t.category_label} ${t.account_name}`.toLowerCase().includes(search.toLowerCase()));
  function exportCsv(){const header=['Дата','Тип','Категория','Описание','Счёт','Сумма (KZT)'];const csv=[header,...list.map(t=>[t.occurred_at,t.transaction_type,t.category_label,t.description,t.account_name,t.amount])].map(row=>row.map(v=>{const raw=String(v??'');const safe=/^[=+@\-]/.test(raw)?`'${raw}`:raw;return '"'+safe.replaceAll('"','""')+'"';}).join(';')).join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='shygyn-operations.csv';anchor.click();URL.revokeObjectURL(url);}
  return <><div className="welcome-row"><div><span className="eyebrow">ВАШИ ДЕНЬГИ</span><h1>Операции</h1><p>История доходов и расходов по всем счетам.</p></div><Button icon={Plus} onClick={onAdd}>Новая операция</Button></div><section className="panel"><div className="filters"><label className="search-field"><Search size={17}/><input placeholder="Найти операцию…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Тип операций" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">Все типы</option><option value="expense">Расходы</option><option value="income">Доходы</option></select><select aria-label="Выбор счета" value={account} onChange={e=>setAccount(e.target.value)}><option value="all">Все счета</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><Button variant="ghost" icon={Download} onClick={exportCsv} disabled={!list.length}>CSV</Button></div><div className="table-result">Найдено операций: {list.length}</div>{list.length?<TransactionItems items={list} onEdit={onEdit} onDelete={onDelete}/>:<Empty title="Ничего не найдено" description="Попробуйте изменить фильтры или добавьте новую операцию." action={<Button icon={Plus} onClick={onAdd}>Добавить операцию</Button>}/>}</section></>;
}
function Analytics({ summary }) {
  const categoriesRows=summary?.categories||[];
  const spent=Number(summary?.expenses||0),earned=Number(summary?.income||0);
  const chartData=categoriesRows.map(r=>({name:r.label,value:Number(r.amount),color:categoryMap[r.category]?.color||'#94B5A6'}));
  const trend=(summary?.daily||[]).map(d=>({date:dayLabel(d.date),Расходы:Number(d.expense),Доходы:Number(d.income)}));
  return <><div className="welcome-row"><div><span className="eyebrow">ФИНАНСЫ В ЦИФРАХ</span><h1>Аналитика</h1><p>Поймите, на что уходят деньги и как меняются траты.</p></div></div><SummaryCards summary={summary}/><div className="dashboard-columns"><section className="panel"><SectionHead eyebrow="СТРУКТУРА ТРАТ" title="Расходы по категориям"/>{chartData.length?<div className="donut-shell"><div className="donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} dataKey="value" nameKey="name" innerRadius={77} outerRadius={110} stroke="none" paddingAngle={3}>{chartData.map((d,i)=><Cell key={i} fill={d.color}/>)}</Pie><Tooltip formatter={v=>money(v)} contentStyle={{background:'#192a22',border:'1px solid #365045',borderRadius:12,color:'#fff'}}/></PieChart></ResponsiveContainer><div className="donut-center"><span>Все расходы</span><strong>{shortMoney(spent)} ₸</strong></div></div></div>:<Empty title="Нет расходов" description="Добавьте расходы для аналитики."/>}</section><section className="panel"><SectionHead eyebrow="ПО КАТЕГОРИЯМ" title="Распределение"/><CategoryBreakdown categories={categoriesRows} total={spent}/></section></div><section className="panel panel--last"><SectionHead eyebrow="ПО ДНЯМ" title="Доходы и расходы"/>{trend.length?<div className="chart-box chart-box--large"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend} margin={{top:10,right:5,bottom:0,left:-15}}><CartesianGrid strokeDasharray="4 4" stroke="#2a3e34" vertical={false}/><XAxis dataKey="date" tick={{fill:'#87998F',fontSize:11}} tickLine={false} axisLine={false}/><YAxis tick={{fill:'#87998F',fontSize:11}} tickFormatter={shortMoney} tickLine={false} axisLine={false}/><Tooltip formatter={v=>money(v)} contentStyle={{background:'#192a22',border:'1px solid #365045',borderRadius:12,color:'#fff'}}/><Legend/><Bar dataKey="Доходы" fill="#76D9B4" radius={[5,5,0,0]}/><Bar dataKey="Расходы" fill="#7B99F1" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>:<Empty title="Нет данных" description="Запишите первую операцию."/>}</section></>;
}
function Accounts({ accounts, onAdd, onEdit, onDelete }) {
  return <><div className="welcome-row"><div><span className="eyebrow">ВСЕ ДЕНЬГИ В ОДНОМ МЕСТЕ</span><h1>Мои счета</h1><p>Учитывайте карты и наличные, даже если они в разных банках.</p></div><Button icon={Plus} onClick={onAdd}>Добавить счёт</Button></div><div className="accounts-hero"><span>Общий баланс</span><strong>{money(accounts.reduce((s,a)=>s+Number(a.balance),0))}</strong><small>{accounts.length} {accounts.length===1?'счёт':'счетов'} · балансы рассчитаны по введённым операциям</small></div>{accounts.length?<div className="accounts-grid">{accounts.map((a,i)=><div key={a.id} className={`account-tile account-tile--${i%3}`}><div className="account-tile__top"><div className="account-tile__icon">{a.account_type==='cash'?<Banknote size={25}/>:<CreditCard size={25}/>}</div><div className="account-tile__actions"><button title="Изменить счёт" aria-label="Изменить счёт" onClick={()=>onEdit(a)}><Pencil size={16}/></button><button title="Удалить счёт" aria-label="Удалить счёт" onClick={()=>onDelete(a)}><Trash2 size={16}/></button></div></div><span className="account-bank">{a.bank||(a.account_type==='cash'?'Наличные':'Без банка')}</span><h3>{a.name}</h3><strong>{money(a.balance)}</strong><small>Начальный остаток: {money(a.opening_balance)}</small></div>)}</div>:<div className="panel"><Empty icon={Wallet} title="Добавьте первый счёт" description="Создайте карту или счёт наличных, чтобы вести учёт расходов." action={<Button icon={Plus} onClick={onAdd}>Создать счёт</Button>}/></div>}<div className="info-line"><Info size={17}/> Подключение к банкам пока недоступно. Здесь вы создаёте учётные счета вручную — никаких номеров карт или банковских паролей не требуется.</div></>;
}
function Loans() {
  const [kind,setKind]=useState('mortgage'); const [amount,setAmount]=useState('5000000'); const [months,setMonths]=useState('60');
  const [result,setResult]=useState(null); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const [lastParams,setLastParams]=useState('');
  const key=`${kind}|${amount}|${months}`;
  async function calculate(e) {
    if(e)e.preventDefault();setBusy(true);setError('');
    try {const data=await api(`/loans/compare/?kind=${encodeURIComponent(kind)}&amount=${encodeURIComponent(amount)}&months=${encodeURIComponent(months)}`);setResult(data);setLastParams(key);}catch(err){setError(err.message);}finally{setBusy(false);}
  }
  useEffect(()=>{ let active=true;api('/loans/compare/?kind=mortgage&amount=5000000&months=60').then(data=>{if(active){setResult(data);setLastParams('mortgage|5000000|60');}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
  const stale=key!==lastParams;
  return <><div className="welcome-row"><div><span className="eyebrow">УМНЫЕ ФИНАНСОВЫЕ РЕШЕНИЯ</span><h1>Кредитный калькулятор</h1><p>Сравнивайте сценарии платежей и переплаты.</p></div></div><div className="loan-warning"><Info size={19}/><div><strong>Учебные примеры — не банковские предложения.</strong><span>Банк A/B/C и ставки условные. Расчёт без комиссий и страховок; ставка не является ГЭСВ. Для выбора кредита проверяйте официальные условия банков.</span></div></div><div className="loan-layout"><section className="panel"><SectionHead eyebrow="ПАРАМЕТРЫ" title="Рассчитать кредит"/><form onSubmit={calculate} className="form-stack loan-form"><label>Цель кредита<div className="loan-kinds">{[{id:'mortgage',name:'Ипотека',icon:House},{id:'auto',name:'Авто',icon:Car},{id:'business',name:'Бизнес',icon:BriefcaseBusiness}].map(x=><button type="button" key={x.id} className={kind===x.id?'selected':''} onClick={()=>setKind(x.id)}><x.icon size={19}/>{x.name}</button>)}</div></label><label>Сумма кредита, ₸<input type="number" required min="10000" max="1000000000" step="1000" value={amount} onChange={e=>setAmount(e.target.value)}/></label><input aria-label="Сумма кредита" type="range" min="100000" max="30000000" step="100000" value={Math.min(30000000,Math.max(100000,Number(amount)||100000))} onChange={e=>setAmount(e.target.value)}/><label>Срок кредита<select value={months} onChange={e=>setMonths(e.target.value)}>{[12,24,36,48,60,84,120,180,240,300,360].map(n=><option value={n} key={n}>{n} мес. ({n/12} г.)</option>)}</select></label>{error&&<div className="inline-error">{error}</div>}<Button className="btn--wide" type="submit" disabled={busy}>{busy?'Расчёт…':'Сравнить сценарии'} <ArrowRight size={17}/></Button></form></section><section className="panel"><SectionHead eyebrow="РЕЗУЛЬТАТЫ" title="Сравнение вариантов"/>{stale&&<div className="info-line"><Info size={15}/> Параметры изменены. Нажмите «Сравнить сценарии».</div>}{result?.offers?<div className="loan-results">{result.offers.map((o,i)=><div className={`loan-offer ${i===0?'loan-offer--best':''}`} key={o.bank}><div className="loan-offer__top"><strong>{o.bank} {i===0&&<span>Наименьшая ставка</span>}</strong><b>{o.annual_rate}% <small>в год*</small></b></div><div className="loan-offer__numbers"><span>Платёж в месяц <strong>{money(o.monthly_payment)}</strong></span><span>Переплата <strong>{money(o.overpayment)}</strong></span></div></div>)}</div>:<Empty title="Нет результатов" description="Введите параметры и запустите расчёт."/>}<p className="loan-footnote">* Номинальная условная ставка. Не ГЭСВ и не гарантия одобрения.</p></section></div></>;
}

export default function App() {
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(!!getToken());
  const [page,setPage]=useState('dashboard');
  const [month,setMonth]=useState(currentMonth);
  const [accounts,setAccounts]=useState([]);
  const [transactions,setTransactions]=useState([]);
  const [budgets,setBudgets]=useState([]);
  const [summary,setSummary]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [modal,setModal]=useState(null);
  const [editItem,setEditItem]=useState(null);
  const [sidebarOpen,setSidebarOpen]=useState(false);

  useEffect(()=>{
    let active=true;
    if(!getToken()){setAuthLoading(false);return;}
    api('/auth/me/').then(me=>{if(active){setUser(me);setAuthLoading(false);}}).catch(()=>{if(active){setToken(null);setUser(null);setAuthLoading(false);}});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    const handler=()=>{setToken(null);setUser(null);};window.addEventListener('shygyn:unauthorized',handler);return()=>window.removeEventListener('shygyn:unauthorized',handler);
  },[]);
  const reload=useCallback(async()=>{
    if(!user)return;
    setLoading(true);
    try{const [a,t,b,s]=await Promise.all([api('/accounts/'),api(`/transactions/?month=${month}`),api('/budgets/'),api(`/summary/?month=${month}`)]);
      setAccounts(a);setTransactions(t);setBudgets(b);setSummary(s);setError('');
    }catch(err){setError(err.message);}finally{setLoading(false);}
  },[user,month]);
  useEffect(()=>{reload();},[reload]);
  function nav(id){setPage(id);setSidebarOpen(false);window.scrollTo({top:0,behavior:'smooth'});}
  function closeModal(){setModal(null);setEditItem(null);}
  async function saved(){closeModal();await reload();}
  function openTxn(item){if(!accounts.length){setError('Сначала добавьте хотя бы один счёт.');nav('accounts');return;}setEditItem(item||null);setModal('transaction');}
  function openAccount(item){setEditItem(item||null);setModal('account');}
  async function deleteTxn(item){if(!window.confirm(`Удалить операцию «${item.description}»?`))return;try{await remove(`/transactions/${item.id}/`);await reload();}catch(err){setError(err.message);}}
  async function deleteAccount(item){if(!window.confirm(`Удалить счёт «${item.name}»?`))return;try{await remove(`/accounts/${item.id}/`);await reload();}catch(err){setError('Не удалось удалить счёт. Если есть операции, сначала удалите или перенесите их.');}}
  async function logout(){try{await post('/auth/logout/',{});}catch(_){}setToken(null);setUser(null);setSummary(null);setAccounts([]);setTransactions([]);setBudgets([]);}
  const prevMonth=()=>setMonth(m=>{let d=new Date(`${m}-01T12:00:00`);d.setMonth(d.getMonth()-1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;});
  const nextMonth=()=>setMonth(m=>{let d=new Date(`${m}-01T12:00:00`);d.setMonth(d.getMonth()+1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;});
  const currentBudget=budgets.find(b=>b.month===`${month}-01`);
  if(authLoading)return <div className="fullscreen-loading"><Logo big/><LoaderCircle className="spin" size={30}/></div>;
  if(!user)return <Auth onAuthed={setUser}/>;
  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen?'sidebar--open':''}`}><div className="sidebar-top"><Logo/><button className="icon-btn sidebar-close" aria-label="Закрыть меню" onClick={()=>setSidebarOpen(false)}><X size={20}/></button></div><div className="sidebar-caption">ВАШ ФИНАНСОВЫЙ ЦЕНТР</div><nav className="sidebar-nav">{NAV.map(n=><button className={page===n.id?'nav-link nav-link--active':'nav-link'} key={n.id} onClick={()=>nav(n.id)}><n.icon size={20} strokeWidth={1.9}/><span>{n.label}</span>{page===n.id&&<span className="nav-dot"/>}</button>)}</nav><div className="sidebar-spacer"/><div className="sidebar-bottom"><div className="side-help"><Sparkles size={22}/><strong>Видьте больше.<br/>Тратьте разумнее.</strong><small>Ваши финансы — под вашим контролем.</small></div><button onClick={logout} className="nav-link logout"><LogOut size={19}/><span>Выйти</span></button></div></aside>
    {sidebarOpen&&<div className="mobile-overlay" onClick={()=>setSidebarOpen(false)}/>}
    <div className="main-area"><header className="topbar"><div className="topbar-left"><button className="icon-btn mobile-menu" aria-label="Открыть меню" onClick={()=>setSidebarOpen(true)}><Menu size={23}/></button><span className="topbar-breadcrumb">Главная <ChevronRight size={14}/> <b>{NAV.find(n=>n.id===page)?.label}</b></span></div><div className="topbar-actions"><div className="month-picker"><button aria-label="Предыдущий месяц" onClick={prevMonth}><ChevronLeft size={18}/></button><span><CalendarDays size={15}/>{monthLabel(month)}</span><button aria-label="Следующий месяц" onClick={nextMonth}><ChevronRight size={18}/></button></div><div className="topbar-avatar" title={user.email}>{(user.first_name||user.email||'S')[0].toUpperCase()}</div></div></header>
      <main className="content">{loading&&!summary&&<div className="loading-line">Загрузка финансов…</div>}
        {page==='dashboard'&&<Dashboard summary={summary} accounts={accounts} openTxn={()=>openTxn()} openBudget={()=>setModal('budget')} go={nav}/>}
        {page==='transactions'&&<Transactions transactions={transactions} accounts={accounts} onAdd={()=>openTxn()} onEdit={openTxn} onDelete={deleteTxn}/>}
        {page==='analytics'&&<Analytics summary={summary}/>}
        {page==='accounts'&&<Accounts accounts={accounts} onAdd={()=>openAccount()} onEdit={openAccount} onDelete={deleteAccount}/>}
        {page==='loans'&&<Loans/>}
        <footer className="app-footer"><span>© {new Date().getFullYear()} Shygyn · MVP</span><span>Финансовая информация вводится пользователем. Банковской интеграции нет.</span></footer>
      </main></div>
    <div className="mobile-bottom-nav">{NAV.map(n=><button key={n.id} className={page===n.id?'active':''} onClick={()=>nav(n.id)}><n.icon size={20}/><span>{n.label}</span></button>)}</div>
    {modal==='transaction'&&<TransactionForm accounts={accounts} initial={editItem} onClose={closeModal} onSave={saved}/>}
    {modal==='account'&&<AccountForm initial={editItem} onClose={closeModal} onSave={saved}/>}
    {modal==='budget'&&<BudgetForm month={month} existing={currentBudget} onClose={closeModal} onSave={saved}/>}
    <Notification text={error} dismiss={()=>setError('')}/>
  </div>;
}
