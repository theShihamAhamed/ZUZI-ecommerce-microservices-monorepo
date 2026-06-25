import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSellerEventApi,
  deleteSellerEventApi,
  getSellerEventApi,
  getSellerEventsApi,
  restoreSellerEventApi,
  updateSellerEventApi,
} from "@/services/event.api";
import {
  SellerEventsQueryParams,
  UpdateSellerEventPayload,
} from "@/types/event";

export const eventQueryKeys = {
  sellerEventsRoot: ["seller-events"] as const,
  sellerEvents: (params: SellerEventsQueryParams) =>
    ["seller-events", params] as const,
  sellerEvent: (eventId: string) => ["seller-event", eventId] as const,
};

export const useEvents = () => {
  const queryClient = useQueryClient();

  const getSellerEvents = (params: SellerEventsQueryParams = {}) =>
    useQuery({
      queryKey: eventQueryKeys.sellerEvents(params),
      queryFn: () => getSellerEventsApi(params),
      placeholderData: (previousData) => previousData,
    });

  const getSellerEvent = (eventId: string) =>
    useQuery({
      queryKey: eventQueryKeys.sellerEvent(eventId),
      queryFn: () => getSellerEventApi(eventId),
      enabled: Boolean(eventId),
    });

  const createSellerEvent = useMutation({
    mutationFn: createSellerEventApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: eventQueryKeys.sellerEventsRoot,
      });
    },
  });

  const updateSellerEvent = useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string;
      data: UpdateSellerEventPayload;
    }) => updateSellerEventApi(eventId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: eventQueryKeys.sellerEventsRoot,
      });
      queryClient.invalidateQueries({
        queryKey: eventQueryKeys.sellerEvent(variables.eventId),
      });
    },
  });

  const deleteSellerEvent = useMutation({
    mutationFn: deleteSellerEventApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: eventQueryKeys.sellerEventsRoot,
      });
    },
  });

  const restoreSellerEvent = useMutation({
    mutationFn: restoreSellerEventApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: eventQueryKeys.sellerEventsRoot,
      });
    },
  });

  return {
    getSellerEvents,
    getSellerEvent,
    createSellerEvent,
    updateSellerEvent,
    deleteSellerEvent,
    restoreSellerEvent,
  };
};
