package dev.abstratium.demo.service;

import java.util.List;

import dev.abstratium.demo.entity.Demo;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class DemoService {

    @Inject
    EntityManager em;

    @Transactional
    public List<Demo> findAll() {
        return em.createQuery("SELECT d FROM Demo d", Demo.class).getResultList();
    }

    @Transactional
    public Demo create(Demo demo) {
        em.persist(demo);
        return demo;
    }

    @Transactional
    public Demo update(Demo demo) {
        em.merge(demo);
        return demo;
    }

    @Transactional
    public void delete(String id) {
        var d = em.find(Demo.class, id);
        if (d != null) {
            em.remove(d);
        }
    }

}
