namespace TaskManager.Backend.Contracts.Api.Cards
{
    public class UpdateCardRequest
    {
        public string CardID { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime DueAtUTC { get; set; } = DateTime.MinValue;
    }
}
