import './DayTimeline.css';

function minutesBetween(t1, t2){
  const [h1,m1] = (t1||'00:00').split(':').map(Number);
  const [h2,m2] = (t2||'00:00').split(':').map(Number);
  return (h2*60+m2) - (h1*60+m1);
}

function normalizeTime(t){
  const [h,m] = (t||'00:00').split(':').map(Number);
  const hh = String(isNaN(h)?0:h).padStart(2,'0');
  const mm = String(isNaN(m)?0:m).padStart(2,'0');
  return `${hh}:${mm}`;
}

export default function DayTimeline({ destinations }){
  if (!destinations || destinations.length === 0) return null;
  // 取有时间的数据
  const withTime = destinations
    .map(d=>({
      id: d.id, name: d.name, arrivalTime: d.arrivalTime || '09:00', stayMinutes: d.stayMinutes || 60
    }))
    .sort((a,b)=> (a.arrivalTime||'').localeCompare(b.arrivalTime||''));

  const start = withTime[0]?.arrivalTime || '09:00';
  const endMinutes = withTime.reduce((mx,cur)=>{
    const endMin = minutesBetween(start, cur.arrivalTime) + (cur.stayMinutes||0);
    return Math.max(mx, endMin);
  }, 0);

  // 一个小时=60min映射为固定像素宽度
  const pxPerMin = 4; // 1分钟4px，1小时240px
  const totalWidth = Math.max(600, endMinutes*pxPerMin + 60);

  return (
    <div className="day-timeline">
      <div className="timeline-header">
        <span>时间轴（从 {normalizeTime(start)} 开始）</span>
      </div>
      <div className="timeline-track" style={{width: totalWidth}}>
        {withTime.map((it,idx)=>{
          const offset = minutesBetween(start, it.arrivalTime)*pxPerMin;
          const width = Math.max(30, (it.stayMinutes||0)*pxPerMin);
          return (
            <div key={it.id} className="timeline-block" style={{left: offset, width}}>
              <div className="block-name" title={`${it.name}`}>{it.name}</div>
              <div className="block-time">{normalizeTime(it.arrivalTime)} · {it.stayMinutes||0}分钟</div>
            </div>
          )
        })}
      </div>
      <div className="timeline-scale" style={{width: totalWidth}}>
        {Array.from({length: Math.ceil(endMinutes/60)+2}).map((_,i)=> (
          <div key={i} className="scale-item" style={{left: i*60*pxPerMin}}>{String(i+parseInt((start||'00:00').split(':')[0],10)).padStart(2,'0')}:00</div>
        ))}
      </div>
    </div>
  );
}
