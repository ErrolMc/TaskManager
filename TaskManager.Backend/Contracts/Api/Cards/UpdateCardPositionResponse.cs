using TaskManager.Backend.Contracts.Shared;

namespace TaskManager.Backend.Contracts.Api.Cards
{
    public class UpdateCardPositionResponse
    {
        public List<ColumnArrangement> AdjustedColumns { get; set; } = new List<ColumnArrangement>();
    }
}
