using TaskManager.Backend.Contracts.Shared;

namespace TaskManager.Backend.Contracts.Api.ListColumns
{
    public class UpdateListColumnPositionResponse
    {
        public List<ItemPosition> UpdatedColumns { get; set; } = [];
    }
}
