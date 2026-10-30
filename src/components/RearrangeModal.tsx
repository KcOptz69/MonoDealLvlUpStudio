import React, { useState } from 'react';
import { GameState, CardInstance } from '../types';
import { getCardDef, COLORS } from '../engineBridge';
import { getCardArt } from '../cardArt';

interface RearrangeModalProps {
  state: GameState;
  onMoveProperty: (cardId: string, color: string, groupId?: string) => void;
  onMoveBuilding: (fromGroupId: string, toGroupId: string, buildingType: 'house' | 'hotel') => void;
  onClose: () => void;
}

export const RearrangeModal: React.FC<RearrangeModalProps> = ({
  state,
  onMoveProperty,
  onMoveBuilding,
  onClose,
}) => {
  const me = state.players[0];
  const colorProps: Array<{ card: CardInstance; groupId: string; groupColor: string }> = [];

  for (const g of me.groups) {
    for (const c of g.cards) {
      colorProps.push({ card: c, groupId: g.id, groupColor: g.color });
    }
  }

  const [selectedCardId, setSelectedCardId] = useState<string>(
    colorProps[0]?.card.id || ''
  );

  const selectedItem = colorProps.find((x) => x.card.id === selectedCardId);
  const selectedDef = selectedItem ? getCardDef(selectedItem.card) : null;
  const allowedColors = selectedItem
    ? selectedItem.card.locked
      ? [selectedItem.card.locked]
      : selectedDef?.colors || []
    : [];

  const [targetColor, setTargetColor] = useState<string>(
    selectedItem?.groupColor || allowedColors[0] || 'Brown'
  );

  // Compatible groups for destination
  const compatibleGroups = me.groups.filter((g) => {
    const colInfo = COLORS[g.color];
    const isNotSame = g.id !== selectedItem?.groupId;
    const isSameColor = g.color === targetColor;
    const hasSpace = colInfo && g.cards.length < colInfo.size;
    return isNotSame && isSameColor && hasSpace;
  });

  const [targetGroupId, setTargetGroupId] = useState<string>('');

  // Buildings owned that can be moved
  const buildingList: Array<{
    groupId: string;
    groupColor: string;
    type: 'house' | 'hotel';
  }> = [];
  for (const g of me.groups) {
    if (g.hotel) buildingList.push({ groupId: g.id, groupColor: g.color, type: 'hotel' });
    if (g.house) buildingList.push({ groupId: g.id, groupColor: g.color, type: 'house' });
  }

  const [showBuildingView, setShowBuildingView] = useState(false);
  const [selectedBuildingIdx, setSelectedBuildingIdx] = useState(0);
  const [destBuildingGroupId, setDestBuildingGroupId] = useState('');

  const handleCardPick = (id: string) => {
    setSelectedCardId(id);
    const item = colorProps.find((x) => x.card.id === id);
    if (item) {
      setTargetColor(item.groupColor);
      setTargetGroupId('');
    }
  };

  const handlePropertySubmit = () => {
    if (!selectedCardId) return;
    onMoveProperty(selectedCardId, targetColor, targetGroupId || undefined);
    onClose();
  };

  const handleBuildingSubmit = () => {
    const b = buildingList[selectedBuildingIdx];
    if (!b || !destBuildingGroupId) return;
    onMoveBuilding(b.groupId, destBuildingGroupId, b.type);
    onClose();
  };

  return (
    <div className="overlay">
      <section className="modal small" role="dialog" aria-modal="true" aria-label="Rearrange properties">
        <div className="modalhead">
          <h2>{showBuildingView ? 'Move a building' : 'Rearrange properties'}</h2>
          <button className="quiet" onClick={onClose} aria-label="Close">×</button>
        </div>

        {!showBuildingView ? (
          <div className="form">
            <p className="muted">
              Choose a property below to change its set or wildcard color. Rearranging is free on
              your turn.
            </p>

            <label>
              Select Property
              <select
                value={selectedCardId}
                onChange={(e) => handleCardPick(e.target.value)}
              >
                {colorProps.map(({ card, groupColor }) => {
                  const def = getCardDef(card);
                  return (
                    <option key={card.id} value={card.id}>
                      {def.name} ({groupColor})
                    </option>
                  );
                })}
              </select>
            </label>

            <label>
              Color
              <select
                value={targetColor}
                onChange={(e) => {
                  setTargetColor(e.target.value);
                  setTargetGroupId('');
                }}
              >
                {allowedColors.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Destination Set
              <select
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
              >
                <option value="">Start a separate {targetColor} set</option>
                {compatibleGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.color} · {g.cards.length} / {COLORS[g.color]?.size} cards
                  </option>
                ))}
              </select>
            </label>

            <small>
              Breaking a set returns its buildings to your hand. Falling below three complete colors
              cancels your defending status.
            </small>

            <div className="modalfooter">
              {buildingList.length > 0 && (
                <button
                  type="button"
                  className="quiet"
                  onClick={() => setShowBuildingView(true)}
                >
                  Move a building
                </button>
              )}
              <button
                type="button"
                className="gold"
                disabled={!selectedCardId}
                onClick={handlePropertySubmit}
              >
                Move property
              </button>
            </div>
          </div>
        ) : (
          <div className="form">
            <label>
              Building
              <select
                value={selectedBuildingIdx}
                onChange={(e) => setSelectedBuildingIdx(Number(e.target.value))}
              >
                {buildingList.map((b, idx) => (
                  <option key={idx} value={idx}>
                    {b.groupColor} {b.type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Destination Set
              <select
                value={destBuildingGroupId}
                onChange={(e) => setDestBuildingGroupId(e.target.value)}
              >
                <option value="">Choose an eligible set...</option>
                {me.groups
                  .filter((g) => {
                    const col = COLORS[g.color];
                    const isFull = col && g.cards.length === col.size;
                    return isFull && !['Railroad', 'Utility'].includes(g.color);
                  })
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.color} · full set
                    </option>
                  ))}
              </select>
            </label>

            <p className="muted">
              Move a Hotel before moving its House. Destination must be a complete set (excluding
              Railroad &amp; Utility).
            </p>

            <div className="modalfooter">
              <button
                type="button"
                className="quiet"
                onClick={() => setShowBuildingView(false)}
              >
                Back to properties
              </button>
              <button
                type="button"
                className="gold"
                disabled={!destBuildingGroupId}
                onClick={handleBuildingSubmit}
              >
                Move building
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
