namespace TaskManager.Backend.Contracts.Shared
{
    public class ColumnArrangement
    {
        public string ListColumnID { get; set; } = string.Empty;
        public List<ItemPosition> CardsPositions { get; set; } = new List<ItemPosition>();
    }
}
