/** The hero illustration: a trusted signal passes the gate, a hostile packet is stopped. */
export default function ShieldArt() {
  return (
    <svg className="shield-art" viewBox="0 0 420 300" role="img" aria-labelledby="shield-title shield-desc">
      <title id="shield-title">A guard stopping a hostile request</title>
      <desc id="shield-desc">
        A trusted request travels along a line through a shield with a lock and reaches a network of agent nodes,
        while a hostile red packet is stopped at the shield.
      </desc>
      <defs>
        <linearGradient id="g-accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--teal)" />
          <stop offset="1" stopColor="var(--lime)" />
        </linearGradient>
      </defs>

      <circle cx="40" cy="150" r="7" fill="var(--teal)" />
      <circle className="pulse" cx="40" cy="150" r="12" fill="none" stroke="var(--teal)" strokeWidth="2" />
      <line className="flow" x1="52" y1="150" x2="150" y2="150" stroke="var(--teal)" strokeWidth="3" strokeLinecap="round" />

      <g className="hostile">
        <circle cx="70" cy="70" r="8" fill="var(--red)" />
        <path d="M66 66 L74 74 M74 66 L66 74" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle className="impact" cx="148" cy="118" r="14" fill="none" stroke="var(--red)" strokeWidth="2" />

      <path d="M210 76 L258 94 V146 C258 176 238 194 210 206 C182 194 162 176 162 146 V94 Z"
        fill="var(--panel-2)" stroke="url(#g-accent)" strokeWidth="3" />
      <rect x="194" y="132" width="32" height="26" rx="5" fill="var(--teal)" />
      <path d="M201 132 V124 A9 9 0 0 1 219 124 V132" fill="none" stroke="var(--teal)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="210" cy="145" r="3.5" fill="var(--bg)" />

      <line className="flow" x1="260" y1="150" x2="306" y2="150" stroke="var(--lime)" strokeWidth="3" strokeLinecap="round" />
      <g stroke="var(--lime)" strokeOpacity="0.55" strokeWidth="2">
        <line x1="318" y1="150" x2="362" y2="104" />
        <line x1="318" y1="150" x2="362" y2="196" />
        <line x1="362" y1="104" x2="398" y2="150" />
        <line x1="362" y1="196" x2="398" y2="150" />
      </g>
      <circle className="node" cx="318" cy="150" r="9" fill="var(--lime)" />
      <circle className="node n2" cx="362" cy="104" r="8" fill="var(--lime)" />
      <circle className="node n3" cx="362" cy="196" r="8" fill="var(--lime)" />
      <circle className="node n2" cx="398" cy="150" r="7" fill="var(--lime)" />

      <text x="40" y="250" className="art-label">request</text>
      <text x="186" y="250" className="art-label">guard</text>
      <text x="336" y="250" className="art-label">agents</text>
    </svg>
  );
}
