# agent.py  (LangGraph-based)
from __future__ import annotations
import os
from typing import List, TypedDict

from langchain_groq import ChatGroq
from langchain_core.messages import AnyMessage, HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode  # executes LangChain tools


# Graph state: a list of messages that grows as the agent runs
class State(TypedDict):
    messages: List[AnyMessage]


class ExpenseTrackerAgent:
    def __init__(self, tools: list):
        self.model_provider = "groq"
        self.tools = tools
        self.app = self._build_app()

    def _build_app(self):
        if self.model_provider != "groq":
            raise ValueError("Unsupported model provider")

        # 1) Model (bound with tools for tool-calling)
        llm = ChatGroq(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            temperature=0,
        ).bind_tools(self.tools)

        # 2) Prompt: system + conversation messages
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an intelligent expense tracking assistant. "
                       "Use tools when they help you answer precisely."),
            MessagesPlaceholder("messages"),
        ])

        # 3) LCEL chain the graph node will run
        chain = prompt | llm

        # 4) Agent node: run the model once
        def agent_node(state: State) -> State:
            ai = chain.invoke({"messages": state["messages"]})
            return {"messages": state["messages"] + [ai]}

        # 5) Router: if the last AI message requested tools, go to tools; else finish
        def route_after_agent(state: State):
            last = state["messages"][-1]
            if isinstance(last, AIMessage) and getattr(last, "tool_calls", None):
                return "tools"
            return END

        # 6) Tool node executes requested tools and appends ToolMessage results
        tool_node = ToolNode(self.tools)

        # 7) Build the graph
        g = StateGraph(State)
        g.add_node("agent", agent_node)
        g.add_node("tools", tool_node)

        g.set_entry_point("agent")
        g.add_conditional_edges("agent", route_after_agent, {"tools": "tools", END: END})
        g.add_edge("tools", "agent")  # loop back to the model after tools run

        return g.compile()

    def chat(self, query: str) -> str:
        # Start a run with a fresh conversation (add your history here if you keep it)
        state = {"messages": [HumanMessage(content=query)]}
        final = self.app.invoke(state)
        # Return the last AI message content
        last_ai = next((m for m in reversed(final["messages"]) if isinstance(m, AIMessage)), None)
        return last_ai.content if last_ai else ""
        

# Tools will be injected by your app (can be LangChain @tool functions or Tool objects)
expense_tracker_agent = ExpenseTrackerAgent(tools=[])
