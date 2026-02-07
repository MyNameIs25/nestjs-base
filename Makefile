.PHONY: up down logs build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	@services=$$(docker-compose ps --services 2>/dev/null); \
	if [ -z "$$services" ]; then \
		echo "No running containers found."; \
		exit 1; \
	fi; \
	max_len=7; \
	for svc in $$services; do \
		len=$${#svc}; \
		if [ $$len -gt $$max_len ]; then max_len=$$len; fi; \
	done; \
	divider=$$(printf '%0.s─' $$(seq 1 $$((max_len + 8)))); \
	echo "┌────┬─$$(printf '%0.s─' $$(seq 1 $$max_len))─┐"; \
	echo "│  # │ $$(printf "%-$${max_len}s" "Service") │"; \
	echo "├────┼─$$(printf '%0.s─' $$(seq 1 $$max_len))─┤"; \
	i=1; \
	for svc in $$services; do \
		echo "│  $$i │ $$(printf "%-$${max_len}s" "$$svc") │"; \
		i=$$((i + 1)); \
	done; \
	echo "│  0 │ $$(printf "%-$${max_len}s" "all") │"; \
	echo "└────┴─$$(printf '%0.s─' $$(seq 1 $$max_len))─┘"; \
	printf "\nSelect service: "; \
	read choice; \
	if [ "$$choice" = "0" ]; then \
		docker-compose logs -f; \
	else \
		selected=$$(echo "$$services" | sed -n "$${choice}p"); \
		if [ -z "$$selected" ]; then \
			echo "Invalid selection."; \
			exit 1; \
		fi; \
		docker-compose logs -f "$$selected"; \
	fi

build:
	docker-compose build
