"""Async Kafka producer and consumer wrappers."""

import json
from typing import Any, Awaitable, Callable, Optional

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

from .exceptions import ServiceUnavailableException
from .logging import get_logger

logger = get_logger(__name__)


class KafkaProducer:
    """Lazy-initialised async Kafka producer."""

    def __init__(
        self,
        bootstrap_servers: str,
        client_id: str,
        acks: str = "all",
        compression_type: str = "gzip",
    ) -> None:
        self._bootstrap_servers = bootstrap_servers
        self._client_id = client_id
        self._acks = acks
        self._compression_type = compression_type
        self._producer: Optional[AIOKafkaProducer] = None

    async def start(self) -> None:
        self._producer = AIOKafkaProducer(
            bootstrap_servers=self._bootstrap_servers,
            client_id=self._client_id,
            acks=self._acks,
            compression_type=self._compression_type,
            value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
            key_serializer=lambda k: k.encode("utf-8") if k else None,
        )
        await self._producer.start()
        logger.info("kafka_producer_started", client_id=self._client_id)

    async def stop(self) -> None:
        if self._producer:
            await self._producer.stop()

    async def send(
        self,
        topic: str,
        value: dict[str, Any],
        key: Optional[str] = None,
        headers: Optional[list[tuple[str, bytes]]] = None,
    ) -> None:
        if not self._producer:
            await self.start()
        await self._producer.send_and_wait(
            topic, value=value, key=key, headers=headers
        )
        logger.debug("kafka_message_sent", topic=topic, key=key)


class KafkaConsumer:
    """Async Kafka consumer with JSON deserialisation and handler dispatch."""

    def __init__(
        self,
        bootstrap_servers: str,
        group_id: str,
        topics: list[str],
        client_id: Optional[str] = None,
        auto_offset_reset: str = "earliest",
    ) -> None:
        self._bootstrap_servers = bootstrap_servers
        self._group_id = group_id
        self._topics = topics
        self._client_id = client_id or group_id
        self._auto_offset_reset = auto_offset_reset
        self._consumer: Optional[AIOKafkaConsumer] = None
        self._handlers: dict[str, Callable[[dict], Awaitable[None]]] = {}

    async def start(self) -> None:
        self._consumer = AIOKafkaConsumer(
            *self._topics,
            bootstrap_servers=self._bootstrap_servers,
            group_id=self._group_id,
            client_id=self._client_id,
            auto_offset_reset=self._auto_offset_reset,
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
            key_deserializer=lambda k: k.decode("utf-8") if k else None,
        )
        await self._consumer.start()
        logger.info(
            "kafka_consumer_started",
            group_id=self._group_id,
            topics=self._topics,
        )

    async def stop(self) -> None:
        if self._consumer:
            await self._consumer.stop()

    def on(self, topic: str, handler: Callable[[dict], Awaitable[None]]) -> None:
        self._handlers[topic] = handler

    async def run(self) -> None:
        if not self._consumer:
            await self.start()
        try:
            async for msg in self._consumer:
                handler = self._handlers.get(msg.topic)
                if handler is None:
                    logger.warning("no_handler", topic=msg.topic)
                    continue
                try:
                    await handler(msg.value)
                except Exception as exc:  # noqa: BLE001
                    logger.error(
                        "handler_error",
                        topic=msg.topic,
                        error=str(exc),
                    )
        except Exception as exc:
            logger.error("kafka_consumer_failed", error=str(exc))
            raise ServiceUnavailableException("Kafka consumer failed") from exc
