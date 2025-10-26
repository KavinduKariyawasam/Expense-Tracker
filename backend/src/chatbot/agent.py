# agent.py  (LangGraph-based)
from __future__ import annotations
import os
from typing import List, TypedDict

from langchain_groq import ChatGroq
from langchain_core.messages import AnyMessage, HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode  # executes LangChain tools
from .tools import AVAILABLE_TOOLS, set_db_connection, set_current_user


# Graph state: a list of messages that grows as the agent runs
class State(TypedDict):
    messages: List[AnyMessage]


class ExpenseTrackerAgent:
    def __init__(self, tools: list = None):
        self.model_provider = "groq"
        self.tools = tools or AVAILABLE_TOOLS
        self.app = self._build_app()

    def bind_tools(self, db_connection):
        set_db_connection(db_connection)

    def set_current_user(self, user_id: int):
        set_current_user(user_id)

    def _build_app(self):
        if self.model_provider != "groq":
            raise ValueError("Unsupported model provider")

        # === 1) Models ===
        # a) tool-calling model (can emit tool_calls)
        llm_tools = ChatGroq(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            temperature=0,
        ).bind_tools(self.tools)

        # b) finalization model (no tools; must produce the final answer)
        llm_final = ChatGroq(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            temperature=0,
        )

        # === 2) Prompts ===
        # For tool-calling step
        prompt_tools = ChatPromptTemplate.from_messages([
            ("system",
             "You are an intelligent expense tracking assistant. "
             "If a tool is needed to answer, call exactly one tool. "
             "Prefer a single tool call; avoid multiple calls unless it is strictly necessary."
            ),
            MessagesPlaceholder("messages"),
        ])

        # For finalization: summarize & answer using tool results now in the transcript
        prompt_final = ChatPromptTemplate.from_messages([
            ("system",
             "You are an intelligent expense tracking assistant. "
             "Now produce the FINAL answer for the user based on the conversation and any tool outputs. "
             "Do NOT call tools. Write a clear, helpful response with numbers and a brief explanation."
             "Use the MARKDOWN format to present tables and lists clearly."
            ),
            MessagesPlaceholder("messages"),
        ])

        chain_tools = prompt_tools | llm_tools
        chain_final = prompt_final | llm_final

        # === 3) Nodes ===
        def agent_node(state: State) -> State:
            ai = chain_tools.invoke({"messages": state["messages"]})
            return {"messages": state["messages"] + [ai]}

        def route_after_agent(state: State):
            last = state["messages"][-1]
            # If the LLM asked for tools, run them; otherwise go to final answer.
            if isinstance(last, AIMessage) and getattr(last, "tool_calls", None):
                return "tools"
            return "final"

        tool_node = ToolNode(self.tools)

        def final_node(state: State) -> State:
            # No tools are available here; this prevents loops.
            ai = chain_final.invoke({"messages": state["messages"]})
            return {"messages": state["messages"] + [ai]}

        # === 4) Graph ===
        g = StateGraph(State)
        g.add_node("agent", agent_node)
        g.add_node("tools", tool_node)
        g.add_node("final", final_node)

        g.set_entry_point("agent")
        g.add_conditional_edges("agent", route_after_agent, {"tools": "tools", "final": "final"})
        # After tools run ONCE, go directly to final to avoid tool ping-pong
        g.add_edge("tools", "final")
        g.add_edge("final", END)

        return g.compile()

    def chat(self, query: str) -> str:
        state = {"messages": [HumanMessage(content=query)]}
        # (Optional) you can cap steps anyway:
        # final = self.app.invoke(state, config={"recursion_limit": 5})
        final = self.app.invoke(state)
        last_ai = next((m for m in reversed(final["messages"]) if isinstance(m, AIMessage)), None)
        return last_ai.content if last_ai else ""
        

# Initialize the agent with tools
expense_tracker_agent = ExpenseTrackerAgent()
