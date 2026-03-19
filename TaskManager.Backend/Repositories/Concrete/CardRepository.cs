using Microsoft.EntityFrameworkCore;
using TaskManager.Backend.Contracts.Shared;
using TaskManager.Backend.Data;
using TaskManager.Backend.Models;

namespace TaskManager.Backend.Repositories.Concrete
{
    public class CardRepository : ICardRepository
    {
        private readonly AppDbContext _context;

        public CardRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<bool> CreateCardAsync(Card card)
        {
            _context.Cards.Add(card);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<List<Card>> GetCardsForBoardAsync(string boardID)
        {
            return await (
                from card in _context.Cards.AsNoTracking()
                join listColumn in _context.ListColumns.AsNoTracking()
                    on card.ColumnID equals listColumn.ColumnID
                where listColumn.BoardID == boardID
                orderby listColumn.Position, card.Position, card.CardID
                select card
            ).ToListAsync();
        }

        public async Task<int> GetNextPositionForColumnAsync(string columnID)
        {
            int? maxPosition = await _context.Cards.AsNoTracking()
                .Where(c => c.ColumnID == columnID)
                .MaxAsync(c => (int?)c.Position);

            return (maxPosition ?? -1) + 1;
        }

        public async Task<Card?> GetCardByIdAsync(string cardID)
        {
            return await _context.Cards.AsNoTracking()
                .FirstOrDefaultAsync(c => c.CardID == cardID);
        }

        public async Task<bool> DeleteCardAsync(string cardID)
        {
            Card? card = await _context.Cards
                .FirstOrDefaultAsync(c => c.CardID == cardID);

            if (card == null)
                return false;

            string columnID = card.ColumnID;
            _context.Cards.Remove(card);

            List<Card> remainingCards = await _context.Cards
                .Where(c => c.ColumnID == columnID)
                .OrderBy(c => c.Position)
                .ThenBy(c => c.CardID)
                .ToListAsync();

            ReassignSequentialPositions(remainingCards);

            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> UpdateCardAsync(string cardID, string title, string description)
        {
            Card? card = await _context.Cards
                .FirstOrDefaultAsync(c => c.CardID == cardID);

            if (card == null)
                return false;

            card.Title = title;
            card.Description = description;

            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<List<ColumnArrangement>?> UpdateCardPositionAsync(string cardID, string listColumnID, int position)
        {
            Card? card = await _context.Cards
                .FirstOrDefaultAsync(c => c.CardID == cardID);

            if (card == null)
                return null;

            string sourceColumnID = card.ColumnID;

            List<Card> sourceCards = await _context.Cards
                .Where(c => c.ColumnID == sourceColumnID)
                .OrderBy(c => c.Position)
                .ThenBy(c => c.CardID)
                .ToListAsync();

            if (sourceCards.Count == 0)
                return null;

            bool hasChanges = NormalizePositions(sourceCards);

            // if card is moved within the same column, just reorder the cards in that column
            if (sourceColumnID == listColumnID)
            {
                int currentIndex = sourceCards.FindIndex(c => c.CardID == cardID);
                if (currentIndex < 0)
                    return null;

                int newIndex = Math.Min(position, sourceCards.Count - 1);

                if (newIndex != currentIndex)
                {
                    Card movingCard = sourceCards[currentIndex];
                    sourceCards.RemoveAt(currentIndex);
                    sourceCards.Insert(newIndex, movingCard);
                    hasChanges = true;
                }

                hasChanges |= ReassignSequentialPositions(sourceCards);

                if (hasChanges && await _context.SaveChangesAsync() <= 0)
                    return null;

                return
                [
                    new ColumnArrangement
                    {
                        ListColumnID = sourceColumnID,
                        CardsPositions = sourceCards
                            .Select(c => new ItemPosition { Id = c.CardID, Position = c.Position })
                            .ToList()
                    }
                ];
            }

            // card has moved to another column, need to update both source and target columns
            List<Card> targetCards = await _context.Cards
                .Where(c => c.ColumnID == listColumnID)
                .OrderBy(c => c.Position)
                .ThenBy(c => c.CardID)
                .ToListAsync();

            hasChanges |= NormalizePositions(targetCards);

            int sourceIndex = sourceCards.FindIndex(c => c.CardID == cardID);
            if (sourceIndex < 0)
                return null;

            Card movedCard = sourceCards[sourceIndex];
            sourceCards.RemoveAt(sourceIndex);
            hasChanges = true;

            int targetIndex = Math.Min(position, targetCards.Count);
            if (targetIndex < 0)
                targetIndex = 0;

            if (movedCard.ColumnID != listColumnID)
            {
                movedCard.ColumnID = listColumnID;
            }

            targetCards.Insert(targetIndex, movedCard);

            hasChanges |= ReassignSequentialPositions(sourceCards);
            hasChanges |= ReassignSequentialPositions(targetCards);

            if (hasChanges && await _context.SaveChangesAsync() <= 0)
                return null;

            return
            [
                new ColumnArrangement
                {
                    ListColumnID = sourceColumnID,
                    CardsPositions = sourceCards
                        .Select(c => new ItemPosition { Id = c.CardID, Position = c.Position })
                        .ToList()
                },
                new ColumnArrangement
                {
                    ListColumnID = listColumnID,
                    CardsPositions = targetCards
                        .Select(c => new ItemPosition { Id = c.CardID, Position = c.Position })
                        .ToList()
                }
            ];
        }

        private static bool NormalizePositions(List<Card> cards)
        {
            bool changed = false;

            for (int i = 0; i < cards.Count; i++)
            {
                if (cards[i].Position != i)
                {
                    cards[i].Position = i;
                    changed = true;
                }
            }

            return changed;
        }

        private static bool ReassignSequentialPositions(List<Card> cards)
        {
            bool changed = false;

            for (int i = 0; i < cards.Count; i++)
            {
                if (cards[i].Position != i)
                {
                    cards[i].Position = i;
                    changed = true;
                }
            }

            return changed;
        }
    }
}
