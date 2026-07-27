import React from 'react';
import { ArrowLeft, Swords, Music, Star, Trophy, Shield, Minus } from 'lucide-react';
import './BattleDetailView.css';

interface BattleDetailViewProps {
  battle: any;
  onBack: () => void;
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  palabras:     { label: 'Palabras',     emoji: '🔤', color: '#60a5fa' },
  tematicas:    { label: 'Temáticas',    emoji: '🎭', color: '#f472b6' },
  cypher:       { label: 'Cypher',       emoji: '🎤', color: '#34d399' },
  terminaciones:{ label: 'Terminaciones',emoji: '🎵', color: '#a78bfa' },
  beatbox:      { label: 'Beatbox',      emoji: '🥁', color: '#fb923c' },
};

export const BattleDetailView: React.FC<BattleDetailViewProps> = ({ battle, onBack }) => {
  const dateStr = new Date(battle.battleDate).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const sortedScores: [string, number][] = battle.scores
    ? (Object.entries(battle.scores as Record<string, number>).sort((a, b) => b[1] - a[1]))
    : [];

  const resultConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    win:      { label: 'VICTORIA',   color: '#00f5ab', icon: <Trophy size={16} /> },
    loss:     { label: 'DERROTA',    color: '#ff3366', icon: <Shield size={16} /> },
    draw:     { label: 'EMPATE',     color: '#facc15', icon: <Minus size={16} /> },
    complete: { label: 'COMPLETADO', color: '#a78bfa', icon: <Star size={16} /> },
  };
  const rc = resultConfig[battle.result] || resultConfig.complete;

  const modeLabel = battle.mode === 'solo'
    ? `Cypher Solitario`
    : `Batalla Grupal`;

  // Group turns by round number for cleaner display
  const roundGroups: { round: number; isDeathmatch: boolean; turns: any[] }[] = [];
  if (battle.details && battle.details.length > 0) {
    battle.details.forEach((turn: any) => {
      const key = turn.isDeathmatch ? -1 : turn.round;
      const existing = roundGroups.find(g => g.round === key);
      if (existing) {
        existing.turns.push(turn);
      } else {
        roundGroups.push({ round: key, isDeathmatch: !!turn.isDeathmatch, turns: [turn] });
      }
    });
  }

  return (
    <div className="battle-detail-overlay">
      {/* Header */}
      <div className="bdv-header">
        <button className="bdv-back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Historial</span>
        </button>
        <div className="bdv-header-center">
          <span className="bdv-mode-label">{modeLabel}</span>
          <span className="bdv-rounds-label">{battle.roundsCount} {battle.roundsCount === 1 ? 'ronda' : 'rondas'}</span>
        </div>
        <div className="bdv-result-badge" style={{ color: rc.color, borderColor: rc.color }}>
          {rc.icon} {rc.label}
        </div>
      </div>

      <div className="bdv-date-bar">{dateStr}</div>

      <div className="bdv-body">

        {/* SCOREBOARD */}
        <section className="bdv-section">
          <div className="bdv-section-header">
            <Swords size={15} />
            <span>Marcador Final</span>
          </div>
          <div className="bdv-scoreboard">
            {sortedScores.length === 0 ? (
              <p className="bdv-empty">Sin datos de puntaje.</p>
            ) : (
              sortedScores.map(([name, score], idx) => {
                const medals = ['🥇', '🥈', '🥉'];
                const isWinner = idx === 0;
                return (
                  <div key={name} className={`bdv-score-row ${isWinner ? 'score-winner' : ''}`}>
                    <span className="bdv-medal">{medals[idx] || `#${idx + 1}`}</span>
                    <div className="bdv-player-info">
                      <span className="bdv-player-name">{name}</span>
                      {isWinner && <span className="bdv-winner-tag">Campeón</span>}
                    </div>
                    <div className="bdv-score-bar-wrap">
                      <div
                        className="bdv-score-bar"
                        style={{
                          width: `${Math.round((score / (sortedScores[0][1] || 1)) * 100)}%`,
                          background: isWinner ? '#00f5ab' : 'rgba(255,255,255,0.15)'
                        }}
                      />
                    </div>
                    <span className="bdv-score-num">{score} pts</span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* TURN-BY-TURN */}
        {battle.details && battle.details.length > 0 ? (
          <section className="bdv-section">
            <div className="bdv-section-header">
              <Star size={15} />
              <span>Turnos de la Batalla</span>
            </div>

            {roundGroups.map((group) => (
              <div key={group.round} className="bdv-round-group">
                <div className={`bdv-round-label ${group.isDeathmatch ? 'deathmatch' : ''}`}>
                  {group.isDeathmatch ? '⚔️ RONDA DE RÉPLICA' : `RONDA ${group.round}`}
                </div>

                {group.turns.map((turn: any, ti: number) => {
                  const cat = CATEGORY_LABELS[turn.challengeCategory] || { label: turn.challengeCategory, emoji: '🎯', color: '#94a3b8' };
                  const totalVoters = turn.votes ? Object.keys(turn.votes).length : 0;
                  const maxPossible = totalVoters * 5;

                  return (
                    <div key={ti} className="bdv-turn-card">
                      {/* Turn header */}
                      <div className="bdv-turn-top">
                        <div className="bdv-turn-player">
                          <span className="bdv-player-avatar">🎤</span>
                          <span className="bdv-turn-player-name">{turn.player}</span>
                        </div>
                        <div className="bdv-turn-score-badge">
                          +{turn.totalScore} pts
                        </div>
                      </div>

                      {/* Challenge card */}
                      <div className="bdv-challenge-block" style={{ borderLeftColor: cat.color }}>
                        <div className="bdv-challenge-cat" style={{ color: cat.color }}>
                          <span>{cat.emoji}</span>
                          <span>{cat.label}</span>
                        </div>
                        <div className="bdv-challenge-title">"{turn.challengeTitle}"</div>
                        {turn.challengePrompt && (
                          <div className="bdv-challenge-prompt">{turn.challengePrompt}</div>
                        )}
                      </div>

                      {/* Beat */}
                      {turn.beatName && turn.beatName !== 'Sin beat' && (
                        <div className="bdv-beat-block">
                          <Music size={13} />
                          <span className="bdv-beat-name">{turn.beatName}</span>
                          {turn.beatBpm > 0 && (
                            <span className="bdv-beat-bpm">{turn.beatBpm} BPM</span>
                          )}
                        </div>
                      )}

                      {/* Votes breakdown */}
                      {turn.votes && Object.keys(turn.votes).length > 0 && (
                        <div className="bdv-votes-block">
                          <div className="bdv-votes-header">
                            <span>Votos</span>
                            <span className="bdv-votes-total">{turn.totalScore} / {maxPossible} pts</span>
                          </div>
                          {Object.entries(turn.votes as Record<string, number>).map(([voter, pts]) => {
                            const pct = Math.round((pts / 5) * 100);
                            return (
                              <div key={voter} className="bdv-vote-row">
                                <span className="bdv-vote-voter">{voter}</span>
                                <div className="bdv-vote-bar-track">
                                  <div className="bdv-vote-bar-fill" style={{ width: `${pct}%` }} />
                                </div>
                                <div className="bdv-vote-stars">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className={`bdv-star ${i < pts ? 'filled' : ''}`}>★</span>
                                  ))}
                                </div>
                                <span className="bdv-vote-pts">{pts}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </section>
        ) : (
          <section className="bdv-section">
            <div className="bdv-empty-detail">
              <Star size={30} opacity={0.3} />
              <p>Esta partida no tiene datos de turno detallados.</p>
              <p className="bdv-empty-sub">Solo las partidas jugadas después de la última actualización guardan el desglose completo.</p>
            </div>
          </section>
        )}

      </div>
    </div>
  );
};
