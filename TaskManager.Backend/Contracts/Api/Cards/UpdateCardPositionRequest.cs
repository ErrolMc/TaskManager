namespace TaskManager.Backend.Contracts.Api.Cards
{
    public class UpdateCardPositionRequest
    {
        public string CardID { get; set; } = string.Empty;
        public string ListColumnID { get; set; } = string.Empty;
        public int NewPosition { get; set; }
    }
}
