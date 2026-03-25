namespace TaskManager.Backend.Contracts.Api.CardMessages
{
    public class GetCardMessagesRequest
    {
        public string BoardID { get; set; } = string.Empty;
        public string CardID { get; set; } = string.Empty;
    }
}
