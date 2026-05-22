import { createContext, useContext, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFriends, getPendingRequests, getBlockedUsers } from "../lib/api";

const FriendsContext = createContext(null);

export const FriendsProvider = ({ children, enabled }) => {
  const queryClient = useQueryClient();

  const { data: friendsData } = useQuery({
    queryKey: ["friends"],
    queryFn: getFriends,
    enabled: !!enabled,
    staleTime: 30_000,
  });

  const { data: requestsData } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getPendingRequests,
    enabled: !!enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const { data: blockedData } = useQuery({
    queryKey: ["blockedUsers"],
    queryFn: getBlockedUsers,
    enabled: !!enabled,
    staleTime: 60_000,
  });

  const friends = friendsData?.friends ?? [];
  const pendingRequests = useMemo(() => ({
    incoming: requestsData?.incoming ?? [],
    outgoing: requestsData?.outgoing ?? [],
  }), [requestsData]);

  const blockedUserIds = useMemo(
    () => new Set((blockedData?.blocked ?? []).map((b) => b.userId)),
    [blockedData]
  );

  const refetchFriends = () => {
    queryClient.invalidateQueries({ queryKey: ["friends"] });
  };
  const refetchRequests = () => {
    queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
  };
  const refetchBlocked = () => {
    queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
  };

  return (
    <FriendsContext.Provider
      value={{ friends, pendingRequests, blockedUserIds, refetchFriends, refetchRequests, refetchBlocked }}
    >
      {children}
    </FriendsContext.Provider>
  );
};

export const useFriends = () => {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error("useFriends must be used inside FriendsProvider");
  return ctx;
};
