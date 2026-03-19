using TaskManager.Backend.Contracts.Shared;
using TaskManager.Backend.Models;

namespace TaskManager.Backend.Repositories
{
    public interface ICardRepository
    {
        public Task<bool> CreateCardAsync(Card card);
        public Task<List<Card>> GetCardsForBoardAsync(string boardID);
        public Task<int> GetNextPositionForColumnAsync(string columnID);
        public Task<Card?> GetCardByIdAsync(string cardID);
        public Task<bool> DeleteCardAsync(string cardID);
        public Task<bool> UpdateCardAsync(string cardID, string title, string description);
        public Task<List<ColumnArrangement>?> UpdateCardPositionAsync(string cardID, string listColumnID, int position);
    }
}
