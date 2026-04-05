import { useQuery } from "@tanstack/react-query";
import { getChannelMessages } from "../lib/api";

export const useChannelMessages = (channelId) => {
	return useQuery({
		queryKey: ["channel-messages", channelId],
		queryFn: () => getChannelMessages(channelId),
		enabled: !!channelId,
		staleTime: 1000 * 30,
	});
};
